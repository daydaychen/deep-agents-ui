"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("globalError");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <Button onClick={() => reset()}>{t("tryAgain")}</Button>
      </body>
    </html>
  );
}
