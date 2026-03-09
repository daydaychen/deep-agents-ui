type Messages = typeof import("../messages/zh.json").default;

declare module "next-intl" {
  interface AppConfig {
    Messages: Messages;
  }
}
