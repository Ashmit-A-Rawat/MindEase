// src/pages/Home.jsx
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslation } from 'react-i18next';
import axios from "axios";

const SPOTIFY_API = "http://localhost:5005";

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

const Home = () => {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const buttonsRef = useRef(null);
  const shapesRef = useRef([]);
  const featuresRef = useRef([]);
  const testimonialsRef = useRef([]);
  const aboutRef = useRef(null);
  const contactRef = useRef(null);
  const [backgroundColor, setBackgroundColor] = useState("from-purple-50 via-pink-50 to-amber-50");
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const { t, i18n } = useTranslation();
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const modalRef = useRef(null);

  const availableLanguages = [
    { code: 'en', name: t('language.english') },
    { code: 'hi', name: t('language.hindi') },
    { code: 'mr', name: t('language.marathi') },
    { code: 'ta', name: t('language.tamil') }
  ];

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setLanguageMenuOpen(false);
  };

  // Spotify's registered OAuth redirect URI points here (the frontend root),
  // not at the Music Therapy page itself — Spotify apps require a fixed,
  // pre-registered redirect URI. Catch the ?code= here, exchange it, then
  // send the user back wherever they started the connect flow from.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) return;

    window.history.replaceState({}, document.title, window.location.pathname);

    axios
      .post(`${SPOTIFY_API}/api/token`, { code })
      .then(({ data }) => {
        if (data.access_token) {
          localStorage.setItem("spotify_token", data.access_token);
          if (data.refresh_token) localStorage.setItem("spotify_refresh_token", data.refresh_token);
        }
      })
      .catch((err) => console.error("Spotify token exchange failed:", err))
      .finally(() => {
        const returnPath = localStorage.getItem("spotify_return_path");
        localStorage.removeItem("spotify_return_path");
        if (returnPath) navigate(returnPath);
      });
  }, [navigate]);

  useEffect(() => {
    // Close modal when clicking outside
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        // Check if the click was on the language button
        const languageButton = document.querySelector('.language-selector-button');
        if (!languageButton || !languageButton.contains(event.target)) {
          setLanguageMenuOpen(false);
        }
      }
    };

    // Close modal when pressing Escape key
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        setLanguageMenuOpen(false);
      }
    };

    if (languageMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
      // Prevent body scrolling when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'unset';
    };
  }, [languageMenuOpen]);

  // Words for the flipping text animation
  const flipWords = t('home.flipWords', { returnObjects: true });

  useEffect(() => {
    // Word flipping animation
    const wordInterval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % flipWords.length);
    }, 3000);

    const tl = gsap.timeline();

    // Initial animations for page elements
    tl.fromTo(containerRef.current, 
      { opacity: 0 },
      { opacity: 1, duration: 1.5, ease: "power2.inOut" }
    )
    .fromTo(titleRef.current,
      { y: -50, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, ease: "back.out(1.7)" },
      "-=0.5"
    )
    .fromTo(subtitleRef.current,
      { y: -30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: "power2.out" },
      "-=0.3"
    );

    // Floating shapes animation
    shapesRef.current.forEach((shape, index) => {
      if (!shape) return;
      
      gsap.to(shape, {
        y: index % 2 === 0 ? -30 : 30,
        x: index % 3 === 0 ? -20 : index % 3 === 1 ? 20 : 0,
        rotation: index % 2 === 0 ? 10 : -10,
        duration: 4 + index,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: index * 0.3
      });
    });

    // Sync background color changes with scroll
    const sections = gsap.utils.toArray('.color-change-section');
    
    sections.forEach((section, i) => {
      const colors = [
        "from-purple-50 via-pink-50 to-amber-50",
        "from-blue-50 via-cyan-50 to-teal-50",
        "from-green-50 via-emerald-50 to-lime-50",
        "from-rose-50 via-pink-50 to-red-50",
        "from-indigo-50 via-purple-50 to-pink-50",
        "from-amber-50 via-orange-50 to-red-50",
        "from-teal-50 via-cyan-50 to-blue-50",
        "from-lime-50 via-green-50 to-emerald-50"
      ];
      
      ScrollTrigger.create({
        trigger: section,
        start: "top center",
        end: "bottom center",
        onEnter: () => setBackgroundColor(colors[i % colors.length]),
        onEnterBack: () => setBackgroundColor(colors[i % colors.length])
      });
    });

    // Features animation on scroll
    featuresRef.current.forEach((feature, index) => {
      if (!feature) return;
      
      gsap.fromTo(feature,
        { y: 100, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          scrollTrigger: {
            trigger: feature,
            start: "top 85%",
            toggleActions: "play none none reverse"
          },
          delay: index * 0.2
        }
      );
    });

    // Testimonials animation
    testimonialsRef.current.forEach((testimonial, index) => {
      if (!testimonial) return;
      
      gsap.fromTo(testimonial,
        { x: index % 2 === 0 ? -100 : 100, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.8,
          scrollTrigger: {
            trigger: testimonial,
            start: "top 85%",
            toggleActions: "play none none reverse"
          },
          delay: index * 0.2
        }
      );
    });

    // About and contact animations
    gsap.fromTo(aboutRef.current,
      { y: 100, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1,
        scrollTrigger: {
          trigger: aboutRef.current,
          start: "top 85%",
          toggleActions: "play none none reverse"
        }
      }
    );

    gsap.fromTo(contactRef.current,
      { y: 100, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1,
        scrollTrigger: {
          trigger: contactRef.current,
          start: "top 85%",
          toggleActions: "play none none reverse"
        }
      }
    );

    return () => {
      // Clean up animations
      clearInterval(wordInterval);
      tl.kill();
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  // Testimonial data
  const testimonials = t('home.testimonials', { returnObjects: true });

  return (
    <div 
      ref={containerRef}
      className={`min-h-screen bg-gradient-to-br ${backgroundColor} flex flex-col items-center justify-start pt-16 overflow-hidden relative transition-all duration-1000 ${languageMenuOpen ? 'overflow-hidden' : ''}`}
    >
      {/* Language Selector Modal */}
      {languageMenuOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            ref={modalRef}
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md"
          >
            <h3 className="text-xl font-semibold text-purple-800 mb-4">Select Language</h3>
            <div className="space-y-3">
              {availableLanguages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => changeLanguage(language.code)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    i18n.language === language.code 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {language.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => setLanguageMenuOpen(false)}
              className="mt-6 w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Header with login button */}
      <header className="w-full fixed top-0 left-0 z-50 bg-white/80 backdrop-blur-sm py-4 px-6 shadow-sm">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <span className="text-2xl font-bold text-purple-700">MindEase</span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setLanguageMenuOpen(true)}
              className="language-selector-button flex items-center text-purple-700 hover:text-purple-900 transition-colors"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path>
              </svg>
              {i18n.language.toUpperCase()}
            </button>
            <Link
              to="/login"
              className="bg-gradient-to-r from-purple-600 to-pink-500 text-white px-6 py-2 rounded-full hover:from-purple-700 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-pink-200/50 font-medium"
            >
              {t('common.login')}
            </Link>
          </div>
        </div>
      </header>

      {/* Background decorative elements */}
      <div className="absolute top-1/4 left-1/4 w-16 h-16 rounded-full bg-purple-300/40" ref={el => shapesRef.current[0] = el}></div>
      <div className="absolute bottom-1/3 right-1/4 w-20 h-20 rounded-full bg-pink-300/40" ref={el => shapesRef.current[1] = el}></div>
      <div className="absolute top-1/3 right-1/3 w-14 h-14 rounded-full bg-amber-300/40" ref={el => shapesRef.current[2] = el}></div>
      <div className="absolute bottom-1/4 left-1/3 w-18 h-18 rounded-full bg-blue-300/40" ref={el => shapesRef.current[3] = el}></div>
      <div className="absolute top-1/2 left-10 w-12 h-12 rounded-full bg-green-300/40" ref={el => shapesRef.current[4] = el}></div>
      <div className="absolute bottom-1/2 right-10 w-10 h-10 rounded-full bg-red-300/40" ref={el => shapesRef.current[5] = el}></div>
      
      {/* Wavy background effect */}
      <div className="absolute inset-0 w-full h-full overflow-hidden z-0 opacity-20">
        <svg className="absolute w-full h-full" viewBox="0 0 1440 900" preserveAspectRatio="none">
          <path 
            d="M0,160L48,176C96,192,192,224,288,218.7C384,213,480,171,576,165.3C672,160,768,192,864,192C960,192,1056,160,1152,144C1248,128,1344,128,1392,128L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" 
            className="fill-purple-300 animate-softWave"
          ></path>
          <path 
            d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,117.3C672,107,768,117,864,122.7C960,128,1056,128,1152,138.7C1248,149,1344,171,1392,181.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" 
            className="fill-pink-300 animate-softWave animation-delay-1000"
          ></path>
          <path 
            d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,197.3C672,192,768,160,864,154.7C960,149,1056,171,1152,170.7C1248,171,1344,149,1392,138.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" 
            className="fill-blue-300 animate-softWave animation-delay-2000"
          ></path>
        </svg>
      </div>

      {/* Background lines effect */}
      <div className="absolute inset-0 w-full h-full overflow-hidden z-0 opacity-30">
        <svg viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {Array.from({ length: 20 }).map((_, idx) => (
            <path
              key={idx}
              d={`M0,${100 + idx * 40} L1440,${100 + (idx * 40) + (idx % 2 === 0 ? 20 : -20)}`}
              stroke={idx % 3 === 0 ? "#8C2F2F" : idx % 3 === 1 ? "#46A5CA" : "#4FAE4D"}
              strokeWidth="1"
              strokeLinecap="round"
              className="animate-drawLine"
              style={{
                animationDelay: `${idx * 0.2}s`,
                animationDuration: "20s"
              }}
            />
          ))}
        </svg>
      </div>

      {/* Hero section */}
      <div className="color-change-section text-center relative z-10 px-4 mb-16 mt-20">
        <h1 ref={titleRef} className="text-6xl md:text-7xl font-bold text-purple-800 mb-6">
          {t('home.hero.title')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600">MindEase</span>
        </h1>
        <p ref={subtitleRef} className="text-xl md:text-2xl text-purple-600/90 mb-6 max-w-3xl mx-auto leading-relaxed">
          {t('home.hero.subtitle')}
        </p>
        
        {/* Text flipping animation */}
        <div className="relative h-16 mb-10 overflow-hidden flex justify-center">
          {flipWords.map((word, index) => (
            <div
              key={word}
              className={`absolute text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 text-transparent bg-clip-text transition-all duration-500 ${
                index === currentWordIndex
                  ? "opacity-100 transform translate-y-0"
                  : "opacity-0 transform -translate-y-8"
              }`}
              style={{ transitionTimingFunction: "cubic-bezier(0.68, -0.55, 0.27, 1.55)" }}
            >
              {word}
            </div>
          ))}
        </div>

        <div ref={buttonsRef} className="space-y-4 sm:space-y-0 mb-20">
          <Link
            to="/signup"
            className="inline-block bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-4 rounded-full hover:from-pink-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-pink-200/50 hover:scale-105 font-medium text-lg"
          >
            {t('home.hero.getStarted')}
          </Link>
        </div>
      </div>

      {/* Features section */}
      <div className="color-change-section w-full py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-purple-800 mb-16">{t('home.features.title')}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            <div 
              ref={el => featuresRef.current[0] = el}
              className="bg-white/80 p-8 rounded-2xl shadow-lg border border-purple-100 transform transition-all duration-300 hover:scale-105 hover:shadow-xl backdrop-blur-sm"
            >
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-purple-800 mb-4">{t('home.features.stressManagement.title')}</h3>
              <p className="text-purple-600/80">{t('home.features.stressManagement.description')}</p>
            </div>
            
            <div 
              ref={el => featuresRef.current[1] = el}
              className="bg-white/80 p-8 rounded-2xl shadow-lg border border-pink-100 transform transition-all duration-300 hover:scale-105 hover:shadow-xl backdrop-blur-sm"
            >
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                <svg className="w-8 h-8 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905a3.61 3.61 0 01-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-pink-800 mb-4">{t('home.features.communitySupport.title')}</h3>
              <p className="text-pink-600/80">{t('home.features.communitySupport.description')}</p>
            </div>
            
            <div 
              ref={el => featuresRef.current[2] = el}
              className="bg-white/80 p-8 rounded-2xl shadow-lg border border-teal-100 transform transition-all duration-300 hover:scale-105 hover:shadow-xl backdrop-blur-sm"
            >
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-teal-800 mb-4">{t('home.features.mindfulness.title')}</h3>
              <p className="text-teal-600/80">{t('home.features.mindfulness.description')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials section */}
      <div className="color-change-section w-full py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-purple-800 mb-16">{t('home.testimonialsTitle')}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index}
                ref={el => testimonialsRef.current[index] = el}
                className="bg-white/80 p-6 rounded-2xl shadow-lg border border-purple-100 transform transition-all duration-300 hover:scale-105 hover:shadow-xl backdrop-blur-sm"
              >
                <div className="text-purple-200 text-4xl mb-4">"</div>
                <p className="text-lg text-purple-700/90 italic mb-4">
                  {testimonial.text}
                </p>
                <div className="text-right">
                  <p className="text-purple-600/70 font-medium">— {t('common.anonymous')}</p>
                  <p className="text-purple-500/60 text-sm">{testimonial.author}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* About Us section */}
      <div ref={aboutRef} className="color-change-section w-full py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-purple-800 mb-16">{t('home.about.title')}</h2>
          
          <div className="max-w-4xl mx-auto bg-white/80 p-10 rounded-2xl shadow-lg border border-purple-100 backdrop-blur-sm">
            <p className="text-lg text-purple-700/90 mb-6">
              {t('home.about.paragraph1')}
            </p>
            <p className="text-lg text-purple-700/90 mb-6">
              {t('home.about.paragraph2')}
            </p>
            <p className="text-lg text-purple-700/90">
              {t('home.about.paragraph3')}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-600 mb-2">{t('home.about.stats.students')}</div>
                <div className="text-purple-700/80">{t('home.about.stats.studentsLabel')}</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-600 mb-2">{t('home.about.stats.campuses')}</div>
                <div className="text-purple-700/80">{t('home.about.stats.campusesLabel')}</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-600 mb-2">{t('home.about.stats.support')}</div>
                <div className="text-purple-700/80">{t('home.about.stats.supportLabel')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Us section */}
      <div ref={contactRef} className="color-change-section w-full py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-purple-800 mb-16">{t('home.contact.title')}</h2>
          
          <div className="max-w-4xl mx-auto bg-white/80 p-10 rounded-2xl shadow-lg border border-purple-100 backdrop-blur-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div>
                <h3 className="text-2xl font-semibold text-purple-800 mb-6">{t('home.contact.getInTouch')}</h3>
                <p className="text-purple-700/90 mb-6">
                  {t('home.contact.description')}
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="bg-purple-100 p-3 rounded-full mr-4">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-purple-800">{t('common.email')}</h4>
                      <p className="text-purple-600/80">support@mindease.com</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-purple-100 p-3 rounded-full mr-4">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-purple-800">{t('home.contact.forCampuses')}</h4>
                      <p className="text-purple-600/80">partnerships@mindease.com</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-2xl font-semibold text-purple-800 mb-6">{t('home.contact.sendMessage')}</h3>
                <form className="space-y-4">
                  <div>
                    <input 
                      type="text" 
                      placeholder={t('home.contact.form.name')}
                      className="w-full px-4 py-3 rounded-lg border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <input 
                      type="email" 
                      placeholder={t('home.contact.form.email')}
                      className="w-full px-4 py-3 rounded-lg border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <textarea 
                      placeholder={t('home.contact.form.message')}
                      rows="4"
                      className="w-full px-4 py-3 rounded-lg border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    ></textarea>
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-3 rounded-lg hover:from-purple-700 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-pink-200/50 font-medium"
                  >
                    {t('home.contact.form.sendButton')}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full py-10 bg-purple-800 text-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <span className="text-2xl font-bold">MindEase</span>
              <p className="text-purple-200 mt-2">{t('home.footer.tagline')}</p>
            </div>
            
            <div className="flex space-x-6">
              <a href="#" className="text-purple-200 hover:text-white transition-colors duration-300">
                {t('home.footer.privacy')}
              </a>
              <a href="#" className="text-purple-200 hover:text-white transition-colors duration-300">
                {t('home.footer.terms')}
              </a>
              <a href="#" className="text-purple-200 hover:text-white transition-colors duration-300">
                {t('home.footer.faq')}
              </a>
            </div>
          </div>
          
          <div className="border-t border-purple-700 mt-8 pt-8 text-center text-purple-300">
            <p>{t('home.footer.copyright')}</p>
          </div>
        </div>
      </footer>

      {/* Add custom CSS for animations */}
      <style jsx>{`
        @keyframes softWave {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-20px) scale(1.05);
          }
        }
        
        @keyframes drawLine {
          from {
            stroke-dasharray: 1000;
            stroke-dashoffset: 1000;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        
        .animate-softWave {
          animation: softWave 8s ease-in-out infinite;
        }
        
        .animation-delay-1000 {
          animation-delay: 1s;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animate-drawLine {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: drawLine 20s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Home;