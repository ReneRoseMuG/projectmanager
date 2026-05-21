import { settingsRegistry, type SettingKey, type SettingValueByKey } from "@taskmanager/shared-types";
import { useSettingsContext } from "../providers/SettingsProvider";

export function useSettings() {
  return useSettingsContext();
}

export function useSetting<Key extends SettingKey>(key: Key): SettingValueByKey[Key] {
  const { settings } = useSettingsContext();
  const setting = settings.find((entry) => entry.key === key);
  return (setting?.resolvedValue ?? settingsRegistry[key].defaultValue) as SettingValueByKey[Key];
}
