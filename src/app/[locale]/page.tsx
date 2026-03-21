/* eslint-disable react-refresh/only-export-components */

import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import ChatPage from "@/app/components/chat/ChatPage";
import { Skeleton } from "@/components/ui/skeleton";
import { routing } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;

  // Enable static rendering
  setRequestLocale(locale);

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center p-4">
          <div className="flex w-full max-w-md flex-col items-center gap-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="mt-4 flex w-full justify-center gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>
      }
    >
      <ChatPage />
    </Suspense>
  );
}
