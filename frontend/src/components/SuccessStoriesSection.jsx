import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  const [isVisible, setIsVisible] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);

  useEffect(() => {
    fetchStories();
  }, []);

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

  const slides = useMemo(() => {
    return stories.flatMap((story) => {
      const images = story.images && story.images.length > 0 ? story.images : [null];
      return images.map((image, imageIndex) => ({
        story,
        image,
        imageIndex,
        totalImages: images.length,
      }));
    });
  }, [stories]);

  useEffect(() => {
    if (isPaused || slides.length <= 1) return;

    const interval = setInterval(() => {
      goToNext();
    }, 5500);

    return () => clearInterval(interval);
  }, [isPaused, currentIndex, slides.length]);

  useEffect(() => {
    if (currentIndex > 0 && currentIndex >= slides.length) {
      setCurrentIndex(0);
    }
  }, [slides.length, currentIndex]);

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

  const truncateText = (text, maxLength = 260) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  const handleReadMore = (storyId) => {
    navigate(`/success-story/${storyId}`);
  };

  const maxIndex = Math.max(0, slides.length - 1);

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev >= maxIndex ? 0 : prev + 1));
  }, [maxIndex]);

  const goToPrev = useCallback(() => {
    setCurrentIndex(prev => (prev <= 0 ? maxIndex : prev - 1));
  }, [maxIndex]);

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

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

  const getCarouselTransform = () => {
    const baseTransform = -(currentIndex * 100);
    const dragTransform = isDragging ? (dragOffset / Math.max(window.innerWidth, 1)) * 100 : 0;
    return `translateX(${baseTransform + dragTransform}%)`;
  };

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
          {slides.length > 1 && (
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
            role="button"
            tabIndex={0}
            aria-label="Success stories carousel"
            onMouseDown={handleDragStart}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={handleDragStart}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') goToPrev();
              if (e.key === 'ArrowRight') goToNext();
            }}
          >
            <div 
              className={`carousel-track ${isDragging ? 'dragging' : ''}`}
              style={{ transform: getCarouselTransform() }}
            >
              {slides.map((slide, index) => (
                <article
                  key={`${slide.story._id || slide.story.id}-${slide.imageIndex}`}
                  className={`story-slide ${isVisible ? 'animate' : ''}`}
                  style={{ animationDelay: `${Math.min(index, 1) * 0.1}s` }}
                >
                  <div className="slide-image-panel">
                    {slide.image ? (
                      <img
                        src={getImageUrl(slide.image)}
                        alt={`Success story ${index + 1}`}
                        className="story-image"
                        loading="lazy"
                      />
                    ) : (
                      <div className="story-image-placeholder">
                        <span className="placeholder-icon">🌟</span>
                      </div>
                    )}
                  </div>

                  <div className="slide-content-panel">
                    <h3 className="story-title">Success Story</h3>
                    <p className="story-excerpt">{truncateText(slide.story.story)}</p>

                    {slide.totalImages > 1 && (
                      <p className="story-image-meta">
                        Image {slide.imageIndex + 1} of {slide.totalImages}
                      </p>
                    )}

                    <button
                      className="read-more-btn"
                      onClick={() => handleReadMore(slide.story._id || slide.story.id)}
                    >
                      <span className="btn-text">Read Full Story</span>
                      <span className="btn-arrow">→</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {slides.length > 1 && (
            <button 
              className="carousel-arrow carousel-arrow-next"
              onClick={goToNext}
              aria-label="Next stories"
            >
              <span className="arrow-icon">›</span>
            </button>
          )}
        </div>

        {slides.length > 1 && (
          <div className="carousel-dots">
            {slides.map((_, index) => (
              <button
                key={index}
                className={`carousel-dot ${index === currentIndex ? 'active' : ''}`}
                onClick={() => goToSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}

      </div>
    </section>
  );
}

export default SuccessStoriesSection;
