import { Inter } from "next/font/google";
import "./globals.css";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import AppSessionProvider from "@/providers/AppSessionProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Kings-Talloc",
  description: "TKS Computing Studies - Tutor Allocation App",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppSessionProvider>
          {children}
        </AppSessionProvider>
      </body>
    </html>
  );
}
