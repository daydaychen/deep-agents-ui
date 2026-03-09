import { type Messages as NextIntlMessages } from "next-intl";

type Messages = typeof import("../../messages/zh.json").default;

declare module "next-intl" {
  interface AppConfig {
    Messages: Messages;
  }
}
