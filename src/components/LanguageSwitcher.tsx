"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { routing } from "@/i18n/routing";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("common");

  const languages = {
    zh: "简体中文",
    en: "English",
  };

  const handleLocaleChange = (newLocale: string) => {
    if (newLocale === locale) return;
    
    // Use the localized router to replace the path
    router.replace(pathname, { locale: newLocale as any });
    
    // Force a full page reload after a short delay to ensure UI updates
    // in complex App Router scenarios with persistent client-side state
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 px-0"
          aria-label={t("language")}
        >
          <Languages className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">{t("language")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8}>
        {routing.locales.map((cur) => (
          <DropdownMenuItem
            key={cur}
            onClick={() => handleLocaleChange(cur)}
            className={locale === cur ? "bg-accent text-accent-foreground" : ""}
          >
            {languages[cur as keyof typeof languages]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
