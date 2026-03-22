import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { successStoryService } from '../services/api';
import { images, hasImage } from '../assets/images';
import './SuccessStoryPage.css';

const API_BASE_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

function SuccessStoryPage() {
  const { storyId } = useParams();
  const navigate = useNavigate();
  
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Gallery carousel state
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [isGalleryTransitioning, setIsGalleryTransitioning] = useState(false);
  
  // Animation states
  const [isVisible, setIsVisible] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  
  // Refs for scroll observation
  const headerRef = useRef(null);
  const galleryRef = useRef(null);
  const contentRef = useRef(null);
  const paragraphRefs = useRef([]);

  useEffect(() => {
    fetchStory();
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, [storyId]);

  useEffect(() => {
    // Trigger entrance animation sequence
    const timer1 = setTimeout(() => setIsVisible(true), 100);
    const timer2 = setTimeout(() => setHeaderVisible(true), 300);
    const timer3 = setTimeout(() => setGalleryVisible(true), 500);
    const timer4 = setTimeout(() => setContentVisible(true), 700);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [story]);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, observerOptions);

    // Observe paragraphs
    paragraphRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [story]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!lightboxOpen) return;
      
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        goToPrevImage();
      } else if (e.key === 'ArrowRight') {
        goToNextImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, currentImageIndex]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [lightboxOpen]);

  const fetchStory = async () => {
    try {
      setLoading(true);
      const response = await successStoryService.getAll();
      if (response.success) {
        const foundStory = response.data.find(
          s => s._id === storyId || s.id === storyId
        );
        if (foundStory) {
          setStory(foundStory);
        } else {
          setError('Story not found');
        }
      }
    } catch (err) {
      console.error('Error fetching story:', err);
      setError('Failed to load story');
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    return `${API_BASE_URL}/${imagePath}`;
  };

  const openLightbox = (index) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const goToPrevImage = useCallback(() => {
    if (!story?.images) return;
    setCurrentImageIndex((prev) => 
      prev === 0 ? story.images.length - 1 : prev - 1
    );
  }, [story]);

  const goToNextImage = useCallback(() => {
    if (!story?.images) return;
    setCurrentImageIndex((prev) => 
      prev === story.images.length - 1 ? 0 : prev + 1
    );
  }, [story]);

  const handleGoBack = () => {
    navigate('/');
  };

  // Gallery navigation
  const goToNextGalleryImage = () => {
    if (!story?.images || isGalleryTransitioning) return;
    setIsGalleryTransitioning(true);
    setGalleryIndex((prev) => (prev + 1) % story.images.length);
    setTimeout(() => setIsGalleryTransitioning(false), 500);
  };

  const goToPrevGalleryImage = () => {
    if (!story?.images || isGalleryTransitioning) return;
    setIsGalleryTransitioning(true);
    setGalleryIndex((prev) => (prev === 0 ? story.images.length - 1 : prev - 1));
    setTimeout(() => setIsGalleryTransitioning(false), 500);
  };

  // Parse story content with proper formatting
  const renderStoryContent = (content) => {
    if (!content) return null;
    
    // Split by double newlines for paragraphs
    const paragraphs = content.split(/\n\n+/);
    
    return paragraphs.map((paragraph, index) => {
      // Check if it's a heading (starts with ##)
      if (paragraph.startsWith('## ')) {
        return (
          <h3 
            key={index} 
            className="story-heading scroll-animate"
            ref={(el) => (paragraphRefs.current[index] = el)}
            style={{ '--delay': `${index * 0.1}s` }}
          >
            {paragraph.replace('## ', '')}
          </h3>
        );
      }
      
      // Check for pull quotes (text wrapped in "")
      if (paragraph.startsWith('"') && paragraph.endsWith('"')) {
        return (
          <blockquote 
            key={index} 
            className="story-pullquote scroll-animate"
            ref={(el) => (paragraphRefs.current[index] = el)}
            style={{ '--delay': `${index * 0.1}s` }}
          >
            {paragraph}
          </blockquote>
        );
      }
      
      // Regular paragraph - preserve single line breaks
      return (
        <p 
          key={index} 
          className="story-paragraph scroll-animate"
          ref={(el) => (paragraphRefs.current[index] = el)}
          style={{ '--delay': `${index * 0.1}s` }}
        >
          {paragraph.split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {line}
              {i < paragraph.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      );
    });
  };

  if (loading) {
    return (
      <div className="story-page">
        <nav className="story-nav">
          <div className="nav-container">
            <div className="nav-left">
              <div className="logo-container">
                {hasImage('logo') ? (
                  <img src={images.logo} alt="CVAPed Logo" className="logo-image" />
                ) : (
                  <div className="logo-placeholder">LOGO</div>
                )}
                {hasImage('cvacareText') ? (
                  <img src={images.cvacareText} alt="CVAPed" className="brand-text-image" />
                ) : (
                  <div className="brand-text">CVAPed</div>
                )}
              </div>
            </div>
            <div className="nav-right">
              <button className="back-btn" onClick={handleGoBack}>
                ← Back to Home
              </button>
            </div>
          </div>
        </nav>
        <div className="story-loading">
          <div className="loading-spinner"></div>
          <p>Loading story...</p>
        </div>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="story-page">
        <nav className="story-nav">
          <div className="nav-container">
            <div className="nav-left">
              <div className="logo-container">
                {hasImage('logo') ? (
                  <img src={images.logo} alt="CVAPed Logo" className="logo-image" />
                ) : (
                  <div className="logo-placeholder">LOGO</div>
                )}
                {hasImage('cvacareText') ? (
                  <img src={images.cvacareText} alt="CVAPed" className="brand-text-image" />
                ) : (
                  <div className="brand-text">CVAPed</div>
                )}
              </div>
            </div>
            <div className="nav-right">
              <button className="back-btn" onClick={handleGoBack}>
                ← Back to Home
              </button>
            </div>
          </div>
        </nav>
        <div className="story-error">
          <div className="error-icon">😔</div>
          <h2>Story Not Found</h2>
          <p>{error || 'The story you are looking for does not exist.'}</p>
          <button className="home-btn" onClick={handleGoBack}>
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  const storyTitle = story.patientName?.trim() || 'Recovery Journey';

  return (
    <div className="story-page">
      {/* Navigation */}
      <nav className="story-nav">
        <div className="nav-container">
          <div className="nav-left">
            <div className="logo-container" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
              {hasImage('logo') ? (
                <img src={images.logo} alt="CVAPed Logo" className="logo-image" />
              ) : (
                <div className="logo-placeholder">LOGO</div>
              )}
              {hasImage('cvacareText') ? (
                <img src={images.cvacareText} alt="CVAPed" className="brand-text-image" />
              ) : (
                <div className="brand-text">CVAPed</div>
              )}
            </div>
          </div>
          <div className="nav-right">
            <button className="back-btn" onClick={handleGoBack}>
              ← Back to Home
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className={`story-main ${isVisible ? 'visible' : ''}`}>
        <article className="story-article">
          {/* Header */}
          <header className={`story-header ${headerVisible ? 'animate-in' : ''}`} ref={headerRef}>
            <button className="breadcrumb-btn" onClick={handleGoBack}>
              ← Back to Success Stories
            </button>
            <h1 className="story-title">{storyTitle}</h1>
            {story.createdByName && (
              <div className="story-meta">
                <span className="story-author">by {story.createdByName}</span>
              </div>
            )}
          </header>

          {/* Image Gallery with Carousel */}
          {story.images && story.images.length > 0 && (
            <section className={`story-gallery ${galleryVisible ? 'animate-in' : ''}`} ref={galleryRef}>
              {story.images.length === 1 ? (
                <div className="gallery-single" onClick={() => openLightbox(0)}>
                  <img 
                    src={getImageUrl(story.images[0])} 
                    alt={storyTitle}
                    className="gallery-image"
                  />
                  <div className="gallery-overlay">
                    <span className="zoom-icon">🔍</span>
                    <span>Click to enlarge</span>
                  </div>
                </div>
              ) : (
                <div className="gallery-carousel">
                  {/* Main Carousel Image */}
                  <div className="carousel-main-image" onClick={() => openLightbox(galleryIndex)}>
                    <img 
                      src={getImageUrl(story.images[galleryIndex])} 
                      alt={`${storyTitle} ${galleryIndex + 1}`}
                      className={`gallery-image ${isGalleryTransitioning ? 'transitioning' : ''}`}
                      key={galleryIndex}
                    />
                    <div className="gallery-overlay">
                      <span className="zoom-icon">🔍</span>
                      <span>Click to enlarge</span>
                    </div>
                  </div>
                  
                  {/* Carousel Navigation */}
                  {story.images.length > 1 && (
                    <>
                      <button 
                        className="gallery-nav gallery-nav-prev"
                        onClick={(e) => { e.stopPropagation(); goToPrevGalleryImage(); }}
                      >
                        ‹
                      </button>
                      <button 
                        className="gallery-nav gallery-nav-next"
                        onClick={(e) => { e.stopPropagation(); goToNextGalleryImage(); }}
                      >
                        ›
                      </button>
                    </>
                  )}
                  
                  {/* Thumbnail Strip */}
                  <div className="gallery-thumbnail-strip">
                    {story.images.map((img, index) => (
                      <button 
                        key={index}
                        className={`gallery-thumb-btn ${index === galleryIndex ? 'active' : ''}`}
                        onClick={() => { setGalleryIndex(index); }}
                      >
                        <img 
                          src={getImageUrl(img)} 
                          alt={`Thumbnail ${index + 1}`}
                          className="thumb-image"
                        />
                      </button>
                    ))}
                  </div>
                  
                  {/* Image Counter */}
                  <div className="gallery-counter">
                    {galleryIndex + 1} / {story.images.length}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Story Content */}
          <section className={`story-body ${contentVisible ? 'animate-in' : ''}`} ref={contentRef}>
            {renderStoryContent(story.story)}
          </section>

        </article>
      </main>

      {/* Lightbox */}
      {lightboxOpen && story.images && (
        <div className="lightbox" onClick={closeLightbox}>
          <button className="lightbox-close" onClick={closeLightbox}>
            ✕
          </button>
          
          <button 
            className="lightbox-nav lightbox-prev" 
            onClick={(e) => { e.stopPropagation(); goToPrevImage(); }}
            disabled={story.images.length <= 1}
          >
            ‹
          </button>
          
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img 
              src={getImageUrl(story.images[currentImageIndex])} 
              alt={`${storyTitle} ${currentImageIndex + 1}`}
              className="lightbox-image"
            />
            <div className="lightbox-counter">
              {currentImageIndex + 1} / {story.images.length}
            </div>
          </div>
          
          <button 
            className="lightbox-nav lightbox-next" 
            onClick={(e) => { e.stopPropagation(); goToNextImage(); }}
            disabled={story.images.length <= 1}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}

export default SuccessStoryPage;
