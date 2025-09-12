'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export default function Kontakt() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    service: 'general'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitStatus('success');
      setFormData({
        name: '',
        email: '',
        phone: '',
        message: '',
        service: 'general'
      });
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setSubmitStatus('idle');
      }, 5000);
    }, 2000);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #000000 100%)',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.25rem 3rem',
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(30px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        zIndex: 1000
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Image
              src="/avanti-logo.svg"
              alt="Avanti"
              width={110}
              height={32}
              priority
              style={{
                color: 'transparent'
              }}
            />
          </Link>
        </div>

        {/* Navigation */}
        <nav style={{ display: 'flex', gap: '2.5rem' }}>
          <Link href="/tjanster" style={{ 
            color: 'rgba(255, 255, 255, 0.85)', 
            textDecoration: 'none', 
            fontSize: '0.8rem', 
            fontWeight: '300',
            letterSpacing: '0.8px',
            transition: 'all 0.3s ease',
            textTransform: 'uppercase'
          }}>Tjänster</Link>
          <Link href="/villkor" style={{ 
            color: 'rgba(255, 255, 255, 0.85)', 
            textDecoration: 'none', 
            fontSize: '0.8rem', 
            fontWeight: '300',
            letterSpacing: '0.8px',
            transition: 'all 0.3s ease',
            textTransform: 'uppercase'
          }}>Villkor</Link>
          <Link href="/om-oss" style={{ 
            color: 'rgba(255, 255, 255, 0.85)', 
            textDecoration: 'none', 
            fontSize: '0.8rem', 
            fontWeight: '300',
            letterSpacing: '0.8px',
            transition: 'all 0.3s ease',
            textTransform: 'uppercase'
          }}>Om oss</Link>
          <Link href="/kontakt" style={{ 
            color: 'rgba(255, 255, 255, 1)', 
            textDecoration: 'none', 
            fontSize: '0.8rem', 
            fontWeight: '400',
            letterSpacing: '0.8px',
            transition: 'all 0.3s ease',
            textTransform: 'uppercase',
            borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
            paddingBottom: '2px'
          }}>Kontakt</Link>
        </nav>
      </header>

      {/* Main Content */}
      <main style={{ 
        padding: '8rem 3rem 3rem', 
        maxWidth: '900px', 
        margin: '0 auto',
        minHeight: '100vh'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <div style={{
            display: 'inline-block',
            padding: '0.5rem 2rem',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '2rem',
            marginBottom: '2rem',
            background: 'rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(10px)'
          }}>
            <span style={{
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.7)',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              fontWeight: '300'
            }}>
              Kontakt
            </span>
          </div>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '200',
            color: 'white',
            marginBottom: '1.5rem',
            letterSpacing: '-0.02em',
            lineHeight: '1.2'
          }}>
            Låt oss hjälpa dig
          </h1>
          <p style={{
            fontSize: '1rem',
            color: 'rgba(255, 255, 255, 0.75)',
            lineHeight: '1.6',
            fontWeight: '300',
            letterSpacing: '0.02em',
            maxWidth: '500px',
            margin: '0 auto'
          }}>
            Vi erbjuder personlig service och professionell hjälp för alla dina transportbehov
          </p>
        </div>

                  {/* Contact Info &amp; Form Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '2rem',
          marginBottom: '3rem'
        }}>
   
          {/* Contact Information */}
          <div>
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: '300',
              color: 'white',
              marginBottom: '1.5rem',
              letterSpacing: '-0.01em',
              position: 'relative'
            }}>
              Kontaktinformation
              <div style={{
                position: 'absolute',
                bottom: '-0.5rem',
                left: '0',
                width: '2rem',
                height: '1px',
                background: 'linear-gradient(90deg, rgba(255,255,255,0.3) 0%, transparent 100%)'
              }}></div>
            </h2>
   
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Phone */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1.25rem',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '0.75rem',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                backdropFilter: 'blur(20px)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
                  pointerEvents: 'none'
                }}></div>
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  border: '1px solid rgba(16, 185, 129, 0.2)'
                }}>
                  📞
                </div>
                <div>
                  <h3 style={{
                    fontSize: '0.85rem',
                    fontWeight: '400',
                    color: 'white',
                    marginBottom: '0.125rem',
                    letterSpacing: '0.02em'
                  }}>
                    Telefon
                  </h3>
                  <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.8rem', fontWeight: '300' }}>+46 72 123 45 67</p>
                  <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem', fontWeight: '300' }}>24/7 tillgänglig</p>
                </div>
              </div>
   
              {/* Email */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1.25rem',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '0.75rem',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                backdropFilter: 'blur(20px)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
                  pointerEvents: 'none'
                }}></div>
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  border: '1px solid rgba(59, 130, 246, 0.2)'
                }}>
                  ✉️
                </div>
                <div>
                  <h3 style={{
                    fontSize: '0.85rem',
                    fontWeight: '400',
                    color: 'white',
                    marginBottom: '0.125rem',
                    letterSpacing: '0.02em'
                  }}>
                    Email
                  </h3>
                  <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.8rem', fontWeight: '300' }}>hello@avanti-app.se</p>
                  <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem', fontWeight: '300' }}>Svar inom 2 timmar</p>
                </div>
              </div>
   
              {/* Address */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1.25rem',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '0.75rem',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                backdropFilter: 'blur(20px)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
                  pointerEvents: 'none'
                }}></div>
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  border: '1px solid rgba(245, 158, 11, 0.2)'
                }}>
                  📍
                </div>
                <div>
                  <h3 style={{
                    fontSize: '0.85rem',
                    fontWeight: '400',
                    color: 'white',
                    marginBottom: '0.125rem',
                    letterSpacing: '0.02em'
                  }}>
                    Adress
                  </h3>
                  <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.8rem', fontWeight: '300' }}>Exempelgatan 1</p>
                  <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.8rem', fontWeight: '300' }}>111 22 Stockholm</p>
                  <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem', fontWeight: '300' }}>Org.nr: 5590-0000</p>
                </div>
              </div>
   
              {/* Business Hours */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1.25rem',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '0.75rem',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                backdropFilter: 'blur(20px)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
                  pointerEvents: 'none'
                }}></div>
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  border: '1px solid rgba(139, 92, 246, 0.2)'
                }}>
                  🕒
                </div>
                <div>
                  <h3 style={{
                    fontSize: '0.85rem',
                    fontWeight: '400',
                    color: 'white',
                    marginBottom: '0.125rem',
                    letterSpacing: '0.02em'
                  }}>
                    Öppettider
                  </h3>
                  <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.8rem', fontWeight: '300' }}>24/7 Service</p>
                  <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem', fontWeight: '300' }}>Kontor: Mån-Fre 9-17</p>
                </div>
              </div>
            </div>
          </div>
   
          {/* Contact Form */}
          <div>
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: '300',
              color: 'white',
              marginBottom: '1.5rem',
              letterSpacing: '-0.01em',
              position: 'relative'
            }}>
              Skicka Meddelande
              <div style={{
                position: 'absolute',
                bottom: '-0.5rem',
                left: '0',
                width: '2rem',
                height: '1px',
                background: 'linear-gradient(90deg, rgba(255,255,255,0.3) 0%, transparent 100%)'
              }}></div>
            </h2>
   
            {submitStatus === 'success' && (
              <div style={{
                padding: '0.75rem 1rem',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '0.375rem',
                marginBottom: '1.5rem',
                color: '#10b981',
                fontSize: '0.8rem',
                backdropFilter: 'blur(10px)'
              }}>
                ✅ Tack för ditt meddelande! Vi återkommer inom kort.
              </div>
            )}
   
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{
                  display: 'block',
                  color: 'rgba(255, 255, 255, 0.9)',
                  marginBottom: '0.5rem',
                  fontSize: '0.8rem',
                  fontWeight: '400',
                  letterSpacing: '0.02em'
                }}>
                  Namn *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    color: 'white',
                    borderRadius: '0.375rem',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    outline: 'none',
                    fontSize: '0.8rem',
                    backdropFilter: 'blur(20px)',
                    transition: 'all 0.3s ease',
                    fontWeight: '300',
                    letterSpacing: '0.02em'
                  }}
                />
              </div>
   
              <div>
                <label style={{
                  display: 'block',
                  color: 'rgba(255, 255, 255, 0.9)',
                  marginBottom: '0.5rem',
                  fontSize: '0.8rem',
                  fontWeight: '400',
                  letterSpacing: '0.02em'
                }}>
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    color: 'white',
                    borderRadius: '0.375rem',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    outline: 'none',
                    fontSize: '0.8rem',
                    backdropFilter: 'blur(20px)',
                    transition: 'all 0.3s ease',
                    fontWeight: '300',
                    letterSpacing: '0.02em'
                  }}
                />
              </div>
   
              <div>
                <label style={{
                  display: 'block',
                  color: 'rgba(255, 255, 255, 0.9)',
                  marginBottom: '0.5rem',
                  fontSize: '0.8rem',
                  fontWeight: '400',
                  letterSpacing: '0.02em'
                }}>
                  Telefon
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    color: 'white',
                    borderRadius: '0.375rem',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    outline: 'none',
                    fontSize: '0.8rem',
                    backdropFilter: 'blur(20px)',
                    transition: 'all 0.3s ease',
                    fontWeight: '300',
                    letterSpacing: '0.02em'
                  }}
                />
              </div>
   
              <div>
                <label style={{
                  display: 'block',
                  color: 'rgba(255, 255, 255, 0.9)',
                  marginBottom: '0.5rem',
                  fontSize: '0.8rem',
                  fontWeight: '400',
                  letterSpacing: '0.02em'
                }}>
                  Ämne
                </label>
                <select
                  name="service"
                  value={formData.service}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    color: 'white',
                    borderRadius: '0.375rem',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    outline: 'none',
                    fontSize: '0.8rem',
                    backdropFilter: 'blur(20px)',
                    transition: 'all 0.3s ease',
                    fontWeight: '300',
                    letterSpacing: '0.02em'
                  }}
                >
                  <option value="general">Allmän fråga</option>
                  <option value="booking">Bokning</option>
                  <option value="support">Support</option>
                  <option value="business">Företagskund</option>
                  <option value="complaint">Klagomål</option>
                </select>
              </div>
   
              <div>
                <label style={{
                  display: 'block',
                  color: 'rgba(255, 255, 255, 0.9)',
                  marginBottom: '0.5rem',
                  fontSize: '0.8rem',
                  fontWeight: '400',
                  letterSpacing: '0.02em'
                }}>
                  Meddelande *
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    color: 'white',
                    borderRadius: '0.375rem',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    outline: 'none',
                    fontSize: '0.8rem',
                    backdropFilter: 'blur(20px)',
                    transition: 'all 0.3s ease',
                    fontWeight: '300',
                    letterSpacing: '0.02em',
                    resize: 'vertical'
                  }}
                />
              </div>
   
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '0.375rem',
                  color: 'white',
                  fontSize: '0.8rem',
                  fontWeight: '400',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  backdropFilter: 'blur(20px)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 100%)',
                  pointerEvents: 'none'
                }}></div>
                {isSubmitting ? (
                  <>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderTop: '1px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    Skickar...
                  </>
                ) : (
                  'Skicka Meddelande'
                )}
              </button>
            </form>
          </div>
        </div>
   
        {/* Emergency Contact */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.03) 100%)',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          border: '1px solid rgba(239, 68, 68, 0.15)',
          textAlign: 'center',
          marginBottom: '2.5rem',
          backdropFilter: 'blur(20px)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.02) 0%, transparent 100%)',
            pointerEvents: 'none'
          }}></div>
          <h3 style={{
            fontSize: '1rem',
            fontWeight: '400',
            color: 'white',
            marginBottom: '0.75rem',
            letterSpacing: '0.02em'
          }}>
            🚨 Akut Transport?
          </h3>
          <p style={{
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            fontWeight: '300',
            letterSpacing: '0.02em'
          }}>
            För akuta transportbehov, ring oss direkt på +46 72 123 45 67
          </p>
          <a
            href="tel:+46721234567"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.1) 100%)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '0.375rem',
              fontWeight: '400',
              fontSize: '0.8rem',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              backdropFilter: 'blur(20px)',
              transition: 'all 0.3s ease',
              letterSpacing: '0.05em',
              textTransform: 'uppercase'
            }}
          >
            Ring Nu
          </a>
        </div>
   
        {/* FAQ Section */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{
            fontSize: '1.125rem',
            fontWeight: '300',
            color: 'white',
            marginBottom: '1.5rem',
            textAlign: 'center',
            letterSpacing: '-0.01em',
            position: 'relative'
          }}>
            Vanliga Frågor
            <div style={{
              position: 'absolute',
              bottom: '-0.5rem',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '3rem',
              height: '1px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)'
            }}></div>
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.25rem'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              backdropFilter: 'blur(20px)',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
                pointerEvents: 'none'
              }}></div>
              <h3 style={{
                fontSize: '0.85rem',
                fontWeight: '400',
                color: 'white',
                marginBottom: '0.5rem',
                letterSpacing: '0.02em'
              }}>
                Hur lång tid i förväg ska jag boka?
              </h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.5', fontSize: '0.75rem', fontWeight: '300' }}>
                Vi rekommenderar minst 30 minuter i förväg, men vi kan ofta hjälpa dig även vid kortare varsel.
              </p>
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              backdropFilter: 'blur(20px)',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
                pointerEvents: 'none'
              }}></div>
              <h3 style={{
                fontSize: '0.85rem',
                fontWeight: '400',
                color: 'white',
                marginBottom: '0.5rem',
                letterSpacing: '0.02em'
              }}>
                Vilka betalningsmetoder accepterar ni?
              </h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.5', fontSize: '0.75rem', fontWeight: '300' }}>
                Vi accepterar alla vanliga kort och faktura för företagskunder.
              </p>
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              backdropFilter: 'blur(20px)',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
                pointerEvents: 'none'
              }}></div>
              <h3 style={{
                fontSize: '0.85rem',
                fontWeight: '400',
                color: 'white',
                marginBottom: '0.5rem',
                letterSpacing: '0.02em'
              }}>
                Är era chaufförer försäkrade?
              </h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.5', fontSize: '0.75rem', fontWeight: '300' }}>
                Ja, alla våra chaufförer är fullt försäkrade och genomgår regelbundna säkerhetskontroller.
              </p>
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              backdropFilter: 'blur(20px)',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
                pointerEvents: 'none'
              }}></div>
              <h3 style={{
                fontSize: '0.85rem',
                fontWeight: '400',
                color: 'white',
                marginBottom: '0.5rem',
                letterSpacing: '0.02em'
              }}>
                Kan jag avboka min resa?
              </h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.5', fontSize: '0.75rem', fontWeight: '300' }}>
                Ja, du kan avboka kostnadsfritt upp till 1 timme före avresan.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        background: 'rgba(0, 0, 0, 0.95)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '2rem 3rem',
        marginTop: '3rem'
      }}>
        <div style={{
          maxWidth: '72rem',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '2rem'
        }}>
          {/* Company Info */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <p style={{
              color: 'white',
              fontSize: '0.9rem',
              fontWeight: '500',
              letterSpacing: '0.02em'
            }}>
              Avanti
            </p>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.85rem',
              lineHeight: '1.6',
              fontWeight: '300'
            }}>
              Vi kör hem din bil – tryggt, diskret och professionellt.
            </p>
          </div>

          {/* Contact Info */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <p style={{
              color: 'white',
              fontSize: '0.9rem',
              fontWeight: '500',
              letterSpacing: '0.02em'
            }}>
              Kontakt
            </p>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.85rem',
              fontWeight: '300'
            }}>
              Telefon: <a href="tel:+46721234567" style={{
                color: 'rgba(255, 255, 255, 0.8)',
                textDecoration: 'none',
                transition: 'color 0.3s ease'
              }}>+46 72 123 45 67</a>
            </p>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.85rem',
              fontWeight: '300'
            }}>
              E‑post: <a href="mailto:hello@avanti-app.se" style={{
                color: 'rgba(255, 255, 255, 0.8)',
                textDecoration: 'none',
                outline: 'none',
                border: 'none',
                transition: 'color 0.3s ease'
              }}>hello@avanti-app.se</a>
            </p>
          </div>

          {/* Company Details */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <p style={{
              color: 'white',
              fontSize: '0.9rem',
              fontWeight: '500',
              letterSpacing: '0.02em'
            }}>
              Företagsinfo
            </p>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.85rem',
              fontWeight: '300'
            }}>
              Org.nr: 5590-0000
            </p>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.85rem',
              fontWeight: '300'
            }}>
              Adress: Exempelgatan 1, 111 22 Stockholm
            </p>
            <div style={{
              display: 'flex',
              gap: '1.5rem',
              marginTop: '0.75rem'
            }}>
              <Link href="/faq" style={{
                color: 'rgba(255, 255, 255, 0.8)',
                textDecoration: 'none',
                fontSize: '0.8rem',
                transition: 'color 0.3s ease',
                fontWeight: '300'
              }}>FAQ</Link>
              <Link href="/integritet" style={{
                color: 'rgba(255, 255, 255, 0.8)',
                textDecoration: 'none',
                fontSize: '0.8rem',
                transition: 'color 0.3s ease',
                fontWeight: '300'
              }}>Integritet</Link>
              <Link href="/kakor" style={{
                color: 'rgba(255, 255, 255, 0.8)',
                textDecoration: 'none',
                fontSize: '0.8rem',
                transition: 'color 0.3s ease',
                fontWeight: '300'
              }}>Kakor</Link>
              <Link href="/villkor" style={{
                color: 'rgba(255, 255, 255, 0.8)',
                textDecoration: 'none',
                fontSize: '0.8rem',
                transition: 'color 0.3s ease',
                fontWeight: '300'
              }}>Villkor</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}


