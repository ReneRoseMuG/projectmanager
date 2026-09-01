import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const pngSignature = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

const shellThumbnailScript = String.raw`
Add-Type -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class TaskManagerShellThumbnail
{
    [StructLayout(LayoutKind.Sequential)]
    private struct NativeSize
    {
        public int Width;
        public int Height;

        public NativeSize(int width, int height)
        {
            Width = width;
            Height = height;
        }
    }

    [Flags]
    private enum ShellItemImageFactoryFlags : uint
    {
        ThumbnailOnly = 0x00000008
    }

    [ComImport]
    [Guid("bcc18b79-ba16-442f-80c4-8a59c30c463b")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IShellItemImageFactory
    {
        [PreserveSig]
        int GetImage(NativeSize size, ShellItemImageFactoryFlags flags, out IntPtr bitmapHandle);
    }

    [DllImport("shell32.dll", CharSet = CharSet.Unicode, PreserveSig = true)]
    private static extern int SHCreateItemFromParsingName(
        string path,
        IntPtr bindingContext,
        ref Guid interfaceId,
        [MarshalAs(UnmanagedType.Interface)] out IShellItemImageFactory imageFactory);

    [DllImport("gdi32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool DeleteObject(IntPtr objectHandle);

    public static void Save(string sourcePath, string targetPath, int width, int height)
    {
        Guid interfaceId = typeof(IShellItemImageFactory).GUID;
        IShellItemImageFactory imageFactory;
        int createResult = SHCreateItemFromParsingName(
            sourcePath,
            IntPtr.Zero,
            ref interfaceId,
            out imageFactory);
        Marshal.ThrowExceptionForHR(createResult);

        IntPtr bitmapHandle = IntPtr.Zero;
        try
        {
            int imageResult = imageFactory.GetImage(
                new NativeSize(width, height),
                ShellItemImageFactoryFlags.ThumbnailOnly,
                out bitmapHandle);
            Marshal.ThrowExceptionForHR(imageResult);

            using (Image image = Image.FromHbitmap(bitmapHandle))
            {
                image.Save(targetPath, ImageFormat.Png);
            }
        }
        finally
        {
            if (bitmapHandle != IntPtr.Zero)
            {
                DeleteObject(bitmapHandle);
            }
            Marshal.ReleaseComObject(imageFactory);
        }
    }
}
'@ -ReferencedAssemblies System.Drawing

[TaskManagerShellThumbnail]::Save(
  $env:TASKMANAGER_SHELL_THUMBNAIL_SOURCE,
  $env:TASKMANAGER_SHELL_THUMBNAIL_TARGET,
  [int]$env:TASKMANAGER_SHELL_THUMBNAIL_WIDTH,
  [int]$env:TASKMANAGER_SHELL_THUMBNAIL_HEIGHT)
`;

interface WindowsShellThumbnailOptions {
  sourcePath: string;
  targetPath: string;
  width: number;
  height: number;
  timeoutMs: number;
}

async function isPng(filePath: string): Promise<boolean> {
  try {
    const handle = await fs.open(filePath, "r");
    try {
      const signature = Buffer.alloc(pngSignature.length);
      const { bytesRead } = await handle.read(
        signature,
        0,
        signature.length,
        0,
      );
      return (
        bytesRead === pngSignature.length && signature.equals(pngSignature)
      );
    } finally {
      await handle.close();
    }
  } catch {
    return false;
  }
}

/** Extracts a real Windows Shell thumbnail. File icons are explicitly rejected. */
export async function extractWindowsShellThumbnail(
  options: WindowsShellThumbnailOptions,
): Promise<boolean> {
  if (process.platform !== "win32") {
    return false;
  }

  const encodedCommand = Buffer.from(shellThumbnailScript, "utf16le").toString(
    "base64",
  );
  try {
    await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-STA",
        "-EncodedCommand",
        encodedCommand,
      ],
      {
        env: {
          ...process.env,
          TASKMANAGER_SHELL_THUMBNAIL_SOURCE: options.sourcePath,
          TASKMANAGER_SHELL_THUMBNAIL_TARGET: options.targetPath,
          TASKMANAGER_SHELL_THUMBNAIL_WIDTH: String(options.width),
          TASKMANAGER_SHELL_THUMBNAIL_HEIGHT: String(options.height),
        },
        timeout: options.timeoutMs,
        windowsHide: true,
        maxBuffer: 64 * 1024,
      },
    );
    if (await isPng(options.targetPath)) {
      return true;
    }
  } catch {
    // Ein fehlender oder fehlerhafter Shell-Handler lässt die Dokumentkachel beim Typ-Icon.
  }

  await fs.rm(options.targetPath, { force: true }).catch(() => undefined);
  return false;
}
