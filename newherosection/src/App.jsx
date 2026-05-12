import './App.css'
import ScrollFeatureSection from './components/ScrollFeatureSection'

function App() {
  return (
    <div className="min-h-screen bg-dark-950">
      {/* Hero spacer - simulate content above */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] rounded-full bg-primary-600/8 blur-[150px]" />
          <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-pink-600/8 blur-[150px]" />
        </div>

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-dark-800/60 border border-dark-700/50 text-dark-300 text-sm mb-8 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-gradient-to-r from-primary-400 to-pink-400" />
            Influencer Marketing Platformu
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.1] mb-8">
            <span className="bg-gradient-to-b from-white to-dark-300 bg-clip-text text-transparent">
              Markanızı
            </span>
            <br />
            <span className="bg-gradient-to-r from-primary-400 via-pink-400 to-primary-400 bg-clip-text text-transparent">
              Büyütün
            </span>
          </h1>
          <p className="text-dark-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-12">
            Infuhub ile doğru influencer'ları bulun, kampanyalarınızı yönetin
            ve sonuçlarınızı ölçün. Hepsi tek bir platformda.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="group relative px-8 py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-pink-500 text-white font-semibold text-base overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/25 hover:scale-[1.02] active:scale-[0.98]">
              <span className="relative z-10">Ücretsiz Başlayın</span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary-400 to-pink-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
            <button className="px-8 py-3.5 rounded-xl border border-dark-700 text-dark-200 font-semibold text-base hover:bg-dark-800/50 hover:border-dark-600 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
              Demo İzleyin
            </button>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-dark-500 animate-bounce">
            <span className="text-xs uppercase tracking-widest">Keşfet</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>
      </section>

      {/* Scroll Feature Section */}
      <ScrollFeatureSection />

      {/* Footer spacer */}
      <section className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-primary-400 to-pink-400 bg-clip-text text-transparent">
              Hemen Başlayın
            </span>
          </h2>
          <p className="text-dark-400 text-lg">
            İlk kampanyanızı bugün oluşturun.
          </p>
        </div>
      </section>
    </div>
  )
}

export default App
