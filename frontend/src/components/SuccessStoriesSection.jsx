import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { successStoryService } from '../services/api';
import './SuccessStoriesSection.css';

const API_BASE_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

function SuccessStoriesSection() {
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const sectionRef = useRef(null);
  const carouselRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  
  // Carousel state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [cardsPerView, setCardsPerView] = useState(4);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);

  useEffect(() => {
    fetchStories();
  }, []);

  // Handle responsive cards per view
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 576) {
        setCardsPerView(1);
      } else if (width < 768) {
        setCardsPerView(2);
      } else if (width < 1024) {
        setCardsPerView(3);
      } else {
        setCardsPerView(4);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Intersection Observer for scroll animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Auto-play carousel
  useEffect(() => {
    if (!isAutoPlaying || isPaused || stories.length <= cardsPerView) return;

    const interval = setInterval(() => {
      goToNext();
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, isPaused, currentIndex, stories.length, cardsPerView]);

  const fetchStories = async () => {
    try {
      setLoading(true);
      const response = await successStoryService.getAll();
      if (response.success) {
        setStories(response.data);
      }
    } catch (err) {
      console.error('Error fetching success stories:', err);
      setError('Failed to load success stories');
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    return `${API_BASE_URL}/${imagePath}`;
  };

  const truncateText = (text, maxLength = 120) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleReadMore = (storyId) => {
    navigate(`/success-story/${storyId}`);
  };

  // Carousel navigation
  const maxIndex = Math.max(0, stories.length - cardsPerView);

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev >= maxIndex ? 0 : prev + 1));
  }, [maxIndex]);

  const goToPrev = useCallback(() => {
    setCurrentIndex(prev => (prev <= 0 ? maxIndex : prev - 1));
  }, [maxIndex]);

  const goToSlide = (index) => {
    setCurrentIndex(Math.min(index, maxIndex));
  };

  // Touch/Drag handlers for swipe
  const handleDragStart = (e) => {
    setIsDragging(true);
    setDragStart(e.type === 'touchstart' ? e.touches[0].clientX : e.clientX);
    setDragOffset(0);
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    const currentX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    setDragOffset(currentX - dragStart);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    if (Math.abs(dragOffset) > 50) {
      if (dragOffset > 0) {
        goToPrev();
      } else {
        goToNext();
      }
    }
    setDragOffset(0);
  };

  // Calculate carousel transform
  const getCarouselTransform = () => {
    const cardWidth = 100 / cardsPerView;
    const baseTransform = -(currentIndex * cardWidth);
    const dragTransform = isDragging ? (dragOffset / (carouselRef.current?.offsetWidth || 1)) * 100 : 0;
    return `translateX(${baseTransform + dragTransform}%)`;
  };

  // Generate dot indicators
  const totalDots = Math.ceil(stories.length / cardsPerView);
  const activeDot = Math.floor(currentIndex / cardsPerView);

  if (loading) {
    return (
      <section className="success-stories-section" ref={sectionRef}>
        <div className="success-stories-container">
          <h2 className="section-title">Success Stories</h2>
          <p className="section-subtitle">Inspiring journeys of recovery and achievement</p>
          <div className="stories-loading">
            <div className="loading-spinner"></div>
            <p>Loading stories...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="success-stories-section" ref={sectionRef}>
        <div className="success-stories-container">
          <h2 className="section-title">Success Stories</h2>
          <p className="section-subtitle">Inspiring journeys of recovery and achievement</p>
          <div className="stories-error">
            <p>{error}</p>
            <button onClick={fetchStories} className="retry-btn">Try Again</button>
          </div>
        </div>
      </section>
    );
  }

  if (stories.length === 0) {
    return (
      <section className="success-stories-section" ref={sectionRef}>
        <div className="success-stories-container">
          <h2 className="section-title">Success Stories</h2>
          <p className="section-subtitle">Inspiring journeys of recovery and achievement</p>
          <div className="stories-empty">
            <div className="empty-icon">📖</div>
            <p>No success stories yet. Check back soon!</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`success-stories-section ${isVisible ? 'visible' : ''}`} ref={sectionRef}>
      <div className="success-stories-container">
        <h2 className="section-title animate-title">Success Stories</h2>
        <p className="section-subtitle animate-subtitle">Inspiring journeys of recovery and achievement</p>
        
        <div 
          className="carousel-wrapper"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Navigation Arrows */}
          {stories.length > cardsPerView && (
            <button 
              className="carousel-arrow carousel-arrow-prev"
              onClick={goToPrev}
              aria-label="Previous stories"
            >
              <span className="arrow-icon">‹</span>
            </button>
          )}

          <div 
            className="carousel-viewport"
            ref={carouselRef}
            onMouseDown={handleDragStart}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={handleDragStart}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
          >
            <div 
              className={`carousel-track ${isDragging ? 'dragging' : ''}`}
              style={{ 
                transform: getCarouselTransform(),
                '--cards-per-view': cardsPerView
              }}
            >
              {stories.map((story, index) => (
                <article 
                  key={story._id || story.id} 
                  className={`story-card ${isVisible ? 'animate' : ''}`}
                  style={{ 
                    animationDelay: `${Math.min(index, 4) * 0.1}s`,
                    '--card-index': index
                  }}
                >
                  <div className="story-image-container">
                    {story.images && story.images.length > 0 ? (
                      <img 
                        src={getImageUrl(story.images[0])} 
                        alt={`${story.patientName}'s story`}
                        className="story-image"
                        loading="lazy"
                      />
                    ) : (
                      <div className="story-image-placeholder">
                        <span className="placeholder-icon">🌟</span>
                      </div>
                    )}
                    {story.images && story.images.length > 1 && (
                      <div className="image-count-badge">
                        +{story.images.length - 1} more
                      </div>
                    )}
                    <div className="image-overlay"></div>
                  </div>
                  
                  <div className="story-content">
                    <h3 className="story-patient-name">{story.patientName}</h3>
                    <p className="story-date">{formatDate(story.createdAt)}</p>
                    <p className="story-excerpt">{truncateText(story.story)}</p>
                    <button 
                      className="read-more-btn"
                      onClick={() => handleReadMore(story._id || story.id)}
                    >
                      <span className="btn-text">Read Full Story</span>
                      <span className="btn-arrow">→</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {stories.length > cardsPerView && (
            <button 
              className="carousel-arrow carousel-arrow-next"
              onClick={goToNext}
              aria-label="Next stories"
            >
              <span className="arrow-icon">›</span>
            </button>
          )}
        </div>

        {/* Carousel Dots */}
        {stories.length > cardsPerView && (
          <div className="carousel-dots">
            {Array.from({ length: totalDots }).map((_, index) => (
              <button
                key={index}
                className={`carousel-dot ${index === activeDot ? 'active' : ''}`}
                onClick={() => goToSlide(index * cardsPerView)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Auto-play indicator */}
        {stories.length > cardsPerView && (
          <div className="carousel-controls">
            <button 
              className={`autoplay-toggle ${isAutoPlaying ? 'playing' : ''}`}
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              aria-label={isAutoPlaying ? 'Pause slideshow' : 'Play slideshow'}
            >
              {isAutoPlaying ? '⏸' : '▶'}
            </button>
          </div>
        )}

        {stories.length > 4 && (
          <div className="view-all-container">
            <button 
              className="view-all-btn"
              onClick={() => navigate('/success-stories')}
            >
              View All Success Stories
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default SuccessStoriesSection;
