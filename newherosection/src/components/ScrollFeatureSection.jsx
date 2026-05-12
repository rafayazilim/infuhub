import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import influencerDiscoveryImg from '../assets/features/influencer_discovery.png';
import campaignManagementImg from '../assets/features/campaign_management.png';
import analyticsDashboardImg from '../assets/features/analytics_dashboard.png';
import securePaymentImg from '../assets/features/secure_payment.png';

const FEATURES = [
    {
        id: 'discovery',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
                <path d="M11 8a3 3 0 0 0-3 3" />
            </svg>
        ),
        title: 'Influencer Keşfi',
        description:
            'Yapay zeka destekli arama motorumuzla markanız için en uygun influencer\'ları saniyeler içinde bulun. Kategori, lokasyon, takipçi sayısı ve etkileşim oranına göre gelişmiş filtrelerle binlerce profil arasından ideal eşleşmeleri keşfedin.',
        image: influencerDiscoveryImg,
        gradient: 'from-primary-500/20 to-pink-500/20',
        accentColor: 'text-primary-400',
        borderColor: 'border-primary-500/50',
        bgGlow: 'bg-primary-500/10',
    },
    {
        id: 'campaign',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                <rect width="20" height="14" x="2" y="6" rx="2" />
            </svg>
        ),
        title: 'Kampanya Yönetimi',
        description:
            'Kampanyalarınızı baştan sona tek bir panelden yönetin. Taslak, aktif, inceleme ve tamamlanmış aşamalarını takip edin. Bütçe planlaması, içerik takvimi ve teslimat takibi ile tüm süreçlerinizi kolaylaştırın.',
        image: campaignManagementImg,
        gradient: 'from-pink-500/20 to-primary-500/20',
        accentColor: 'text-pink-400',
        borderColor: 'border-pink-500/50',
        bgGlow: 'bg-pink-500/10',
    },
    {
        id: 'analytics',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" />
                <path d="m19 9-5 5-4-4-3 3" />
            </svg>
        ),
        title: 'Detaylı Analitik',
        description:
            'Kampanyalarınızın performansını gerçek zamanlı olarak izleyin. Erişim, etkileşim, dönüşüm oranı ve ROI gibi kritik metrikleri görsel grafikler ve raporlarla analiz edin. Veriye dayalı kararlar alın.',
        image: analyticsDashboardImg,
        gradient: 'from-primary-400/20 to-pink-400/20',
        accentColor: 'text-primary-300',
        borderColor: 'border-primary-400/50',
        bgGlow: 'bg-primary-400/10',
    },
    {
        id: 'payment',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                <path d="m9 12 2 2 4-4" />
            </svg>
        ),
        title: 'Güvenli Ödeme',
        description:
            'Güvenli escrow sistemiyle ödemelerinizi koruma altına alın. Kilometre taşlarına dayalı ödeme planları oluşturun, teslimat onaylandıktan sonra otomatik ödeme serbest bırakma ile hem markalar hem de influencer\'lar için güvence sağlayın.',
        image: securePaymentImg,
        gradient: 'from-pink-400/20 to-primary-400/20',
        accentColor: 'text-pink-300',
        borderColor: 'border-pink-400/50',
        bgGlow: 'bg-pink-400/10',
    },
];

export default function ScrollFeatureSection() {
    const sectionRef = useRef(null);
    const featureRefs = useRef([]);
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            if (!sectionRef.current) return;

            const sectionTop = sectionRef.current.offsetTop;
            const sectionHeight = sectionRef.current.offsetHeight;
            const scrollY = window.scrollY;
            const viewportHeight = window.innerHeight;

            // Calculate relative scroll position within the section
            const relativeScroll = scrollY - sectionTop + viewportHeight * 0.4;
            const segmentHeight = sectionHeight / FEATURES.length;

            let newIndex = Math.floor(relativeScroll / segmentHeight);
            newIndex = Math.max(0, Math.min(FEATURES.length - 1, newIndex));

            setActiveIndex(newIndex);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // Initial call
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <section
            ref={sectionRef}
            id="features"
            className="relative"
            style={{ minHeight: `${FEATURES.length * 100}vh` }}
        >
            {/* Background decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-64 w-[500px] h-[500px] rounded-full bg-primary-600/5 blur-[120px]" />
                <div className="absolute top-1/2 -right-64 w-[500px] h-[500px] rounded-full bg-pink-600/5 blur-[120px]" />
                <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] rounded-full bg-primary-500/3 blur-[100px]" />
            </div>

            {/* Section Header */}
            <div className="relative z-10 pt-24 pb-16 px-6 max-w-7xl mx-auto text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                >
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-300 text-sm font-medium mb-6">
                        <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
                        Platform Özellikleri
                    </span>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                        <span className="bg-gradient-to-r from-white via-white to-dark-300 bg-clip-text text-transparent">
                            Her Şey Tek Bir
                        </span>
                        <br />
                        <span className="bg-gradient-to-r from-primary-400 to-pink-400 bg-clip-text text-transparent">
                            Platformda
                        </span>
                    </h2>
                    <p className="text-dark-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                        Influencer marketing süreçlerinizi uçtan uca yönetin.
                        Keşiften ödemeye kadar tüm adımlar Infuhub'da.
                    </p>
                </motion.div>
            </div>

            {/* Sticky Container */}
            <div className="sticky top-0 h-screen flex items-center">
                <div className="w-full max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                        {/* Left Column - Accordion */}
                        <div className="flex flex-col gap-2">
                            {FEATURES.map((feature, index) => {
                                const isActive = index === activeIndex;
                                return (
                                    <motion.div
                                        key={feature.id}
                                        ref={(el) => (featureRefs.current[index] = el)}
                                        className={`relative rounded-2xl transition-all duration-500 cursor-pointer ${isActive
                                                ? `bg-gradient-to-br ${feature.gradient} border ${feature.borderColor} shadow-lg shadow-dark-950/50`
                                                : 'bg-dark-900/30 border border-dark-800/50 hover:bg-dark-800/40 hover:border-dark-700/50'
                                            }`}
                                        onClick={() => {
                                            // Scroll to the correct position for clicked feature
                                            if (sectionRef.current) {
                                                const sectionTop = sectionRef.current.offsetTop;
                                                const sectionHeight = sectionRef.current.offsetHeight;
                                                const segmentHeight = sectionHeight / FEATURES.length;
                                                const targetScroll = sectionTop + segmentHeight * index;
                                                window.scrollTo({ top: targetScroll, behavior: 'smooth' });
                                            }
                                        }}
                                        animate={{
                                            opacity: isActive ? 1 : 0.55,
                                        }}
                                        transition={{ duration: 0.4, ease: 'easeOut' }}
                                    >
                                        {/* Active indicator line */}
                                        {isActive && (
                                            <motion.div
                                                className={`absolute left-0 top-4 bottom-4 w-1 rounded-full bg-gradient-to-b ${index % 2 === 0
                                                        ? 'from-primary-400 to-pink-400'
                                                        : 'from-pink-400 to-primary-400'
                                                    }`}
                                                layoutId="activeIndicator"
                                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                            />
                                        )}

                                        <div className="p-5 lg:p-6">
                                            {/* Header */}
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-500 ${isActive
                                                            ? `${feature.bgGlow} ${feature.accentColor} ring-1 ring-inset ${feature.borderColor}`
                                                            : 'bg-dark-800/50 text-dark-400'
                                                        }`}
                                                >
                                                    {feature.icon}
                                                </div>
                                                <h3
                                                    className={`text-lg lg:text-xl font-semibold transition-colors duration-500 ${isActive ? 'text-white' : 'text-dark-300'
                                                        }`}
                                                >
                                                    {feature.title}
                                                </h3>

                                                {/* Expand/collapse indicator */}
                                                <motion.div
                                                    className="ml-auto flex-shrink-0"
                                                    animate={{ rotate: isActive ? 180 : 0 }}
                                                    transition={{ duration: 0.3 }}
                                                >
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        className={`w-5 h-5 transition-colors duration-500 ${isActive ? 'text-dark-300' : 'text-dark-600'
                                                            }`}
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <path d="m6 9 6 6 6-6" />
                                                    </svg>
                                                </motion.div>
                                            </div>

                                            {/* Accordion Content */}
                                            <AnimatePresence mode="wait">
                                                {isActive && (
                                                    <motion.div
                                                        key={`content-${feature.id}`}
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{
                                                            height: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
                                                            opacity: { duration: 0.3, delay: 0.1 },
                                                        }}
                                                        className="overflow-hidden"
                                                    >
                                                        <p className="mt-4 text-dark-300 text-sm lg:text-base leading-relaxed pl-15">
                                                            {feature.description}
                                                        </p>

                                                        {/* Feature highlights */}
                                                        <div className="mt-4 pl-15 flex flex-wrap gap-2">
                                                            {getFeatureTags(index).map((tag, i) => (
                                                                <span
                                                                    key={i}
                                                                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${feature.bgGlow} ${feature.accentColor} border ${feature.borderColor}`}
                                                                >
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </motion.div>
                                );
                            })}

                            {/* Progress indicator */}
                            <div className="flex items-center gap-2 mt-4 pl-2">
                                {FEATURES.map((_, index) => (
                                    <motion.div
                                        key={index}
                                        className={`h-1 rounded-full transition-colors duration-500 ${index <= activeIndex
                                                ? 'bg-gradient-to-r from-primary-400 to-pink-400'
                                                : 'bg-dark-800'
                                            }`}
                                        animate={{
                                            width: index === activeIndex ? 32 : 12,
                                        }}
                                        transition={{ duration: 0.4, ease: 'easeOut' }}
                                    />
                                ))}
                                <span className="ml-2 text-xs text-dark-500 tabular-nums">
                                    {String(activeIndex + 1).padStart(2, '0')}/{String(FEATURES.length).padStart(2, '0')}
                                </span>
                            </div>
                        </div>

                        {/* Right Column - Image */}
                        <div className="relative hidden lg:flex items-center justify-center">
                            {/* Glow background */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <motion.div
                                    className="w-[85%] h-[85%] rounded-3xl blur-[60px] opacity-30"
                                    animate={{
                                        background:
                                            activeIndex % 2 === 0
                                                ? 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(236,72,153,0.15))'
                                                : 'linear-gradient(135deg, rgba(236,72,153,0.3), rgba(99,102,241,0.15))',
                                    }}
                                    transition={{ duration: 0.8 }}
                                />
                            </div>

                            {/* Image container */}
                            <div className="relative w-full max-w-lg">
                                {/* Decorative frame */}
                                <div className="absolute -inset-4 rounded-3xl border border-dark-700/30 bg-gradient-to-br from-dark-800/20 to-dark-900/20 backdrop-blur-sm" />

                                {/* Dot grid decoration */}
                                <div className="absolute -top-8 -right-8 grid grid-cols-4 gap-2 opacity-20">
                                    {Array.from({ length: 16 }).map((_, i) => (
                                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                                    ))}
                                </div>
                                <div className="absolute -bottom-8 -left-8 grid grid-cols-4 gap-2 opacity-20">
                                    {Array.from({ length: 16 }).map((_, i) => (
                                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                                    ))}
                                </div>

                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={`image-${activeIndex}`}
                                        initial={{ opacity: 0, y: 20, scale: 0.97 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -20, scale: 0.97 }}
                                        transition={{
                                            duration: 0.5,
                                            ease: [0.22, 1, 0.36, 1],
                                        }}
                                        className="relative z-10"
                                    >
                                        <div className="rounded-2xl overflow-hidden border border-dark-700/50 shadow-2xl shadow-dark-950/50">
                                            <img
                                                src={FEATURES[activeIndex].image}
                                                alt={FEATURES[activeIndex].title}
                                                className="w-full h-auto object-cover"
                                                loading="lazy"
                                            />
                                        </div>

                                        {/* Floating label */}
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.3, duration: 0.4 }}
                                            className="absolute -bottom-4 -left-4 z-20"
                                        >
                                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-900/90 border border-dark-700/50 backdrop-blur-md shadow-lg">
                                                <div className={`w-2 h-2 rounded-full ${activeIndex % 2 === 0 ? 'bg-primary-400' : 'bg-pink-400'} animate-pulse`} />
                                                <span className="text-sm font-medium text-white">
                                                    {FEATURES[activeIndex].title}
                                                </span>
                                            </div>
                                        </motion.div>
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Mobile Image (shown below accordion on mobile) */}
                        <div className="lg:hidden relative">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={`mobile-image-${activeIndex}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.4 }}
                                >
                                    <div className="rounded-2xl overflow-hidden border border-dark-700/50 shadow-xl">
                                        <img
                                            src={FEATURES[activeIndex].image}
                                            alt={FEATURES[activeIndex].title}
                                            className="w-full h-auto object-cover"
                                            loading="lazy"
                                        />
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function getFeatureTags(index) {
    const tags = [
        ['AI Arama', 'Gelişmiş Filtre', 'Profil Analizi'],
        ['Kanban Board', 'Bütçe Takibi', 'İçerik Takvimi'],
        ['Gerçek Zamanlı', 'ROI Hesaplama', 'Özel Raporlar'],
        ['Escrow Sistemi', 'Otomatik Ödeme', 'Güvenlik Garantisi'],
    ];
    return tags[index] || [];
}
