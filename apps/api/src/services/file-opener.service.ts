import { execFile } from "node:child_process";
import { promisify } from "node:util";

export type FileOpener = (filePath: string) => Promise<void>;

const execFileAsync = promisify(execFile);

export async function openFileWithDefaultApp(filePath: string): Promise<void> {
  if (process.platform === "win32") {
    await execFileAsync("cmd.exe", ["/c", "start", "", filePath], { windowsHide: true });
    return;
  }

  if (process.platform === "darwin") {
    await execFileAsync("open", [filePath], { windowsHide: true });
    return;
  }

  await execFileAsync("xdg-open", [filePath], { windowsHide: true });
}
