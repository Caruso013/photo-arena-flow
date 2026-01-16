import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import SidebarAd from '../ads/SidebarAd';

interface MainLayoutProps {
  children: React.ReactNode;
  /** Se true, não exibe anúncios laterais (ex: Home) */
  hideAds?: boolean;
}

const MainLayout = ({ children, hideAds = false }: MainLayoutProps) => {
  const location = useLocation();
  
  // Páginas onde os anúncios NÃO devem aparecer
  const noAdsPages = ['/', '/home'];
  const shouldShowAds = !hideAds && !noAdsPages.includes(location.pathname);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      {/* Anúncios laterais - apenas em desktop e fora da home */}
      {shouldShowAds && (
        <>
          <SidebarAd position="left" />
          <SidebarAd position="right" />
        </>
      )}
      
      <main className={`flex-1 ${shouldShowAds ? 'xl:mx-[180px]' : ''}`}>
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;
