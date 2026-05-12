import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import { trackPageView } from '@/utils/metaPixel';

/**
 * `index.html` içindeki ilk `PageView` ile çakışmayı önlemek için
 * bileşenin ilk bağlanmasında (hydration sonrası) izleme yapılmaz;
 * bundan sonra her rota / search değişiminde Meta PageView gönderilir.
 */
export function usePageTracking() {
  const location = useLocation();
  const skipInitial = useRef(true);

  useEffect(() => {
    if (skipInitial.current) {
      skipInitial.current = false;
      return;
    }
    trackPageView();
  }, [location.pathname, location.search, location.hash]);
}
