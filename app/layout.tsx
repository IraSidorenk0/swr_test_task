import "../styles/globals.css";
import Providers from "./providers";
import Navigation from "./components/Navigation";

export const metadata = {
  title: "Best Blog",
  description: "Modern blog with SWR and Firebase",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Navigation />
            <main className="flex-1">
              {children}
            </main>
            <footer className="bg-white border-t border-gray-200 py-8 mt-12">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
                <p>&copy; 2024 Best Blog. Создано с ❤️ используя Next.js и Firebase.</p>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}