import "./../styles/globals.css";
import { ToastProvider } from "@openforgelabs/rainbow-ui";
import { ShellLayout } from "@/components/layout/ShellLayout";
import { ThemeProvider } from "@/lib/theme";

export const metadata = {
  title: "RainbowExplorer",
  description: "Infrastructure explorer shell",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@100..700&display=swap"
        />
      </head>
      <body className="min-h-screen">
        <ThemeProvider>
          <ToastProvider>
            <ShellLayout>{children}</ShellLayout>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
