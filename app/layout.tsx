import "../styles/globals.css";
import Navigation from "./components/Navigation";
import { getCurrentUser } from "../firebase/auth";

export const metadata = {
  title: 'Best Blog',
  description: 'A blog platform built with Next.js and Firebase',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await getCurrentUser();
  return (
    <html lang="ru" className="h-full">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        <div className="min-h-screen flex flex-col">
            <Navigation currentUser={currentUser} />
            <main className="flex-1">
              {children}
            </main>
            <footer className="bg-white border-t border-gray-200 py-8 mt-12">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
                <p>&copy; 2024 Best Blog. Created with ❤️ using Next.js and Firebase.</p>
              </div>
            </footer>
          </div>
      </body>
    </html>
  );
}