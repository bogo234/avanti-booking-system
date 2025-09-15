'use client';

import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { UserProfile, updateUserProfile, changeUserPassword } from '../../lib/user-management';
import { authApiClient, AuthApiError, RateLimitError, UserProfileData, PasswordStrength } from '../../lib/auth-api-client';
import Image from 'next/image';

interface UserProfileProps {
  user: User;
  userProfile: UserProfile | null;
  onProfileUpdate: () => void;
}

export default function UserProfileComponent({ 
  user, 
  userProfile, 
  onProfileUpdate 
}: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rateLimitInfo, setRateLimitInfo] = useState<{ resetIn?: number } | null>(null);
  
  // Password strength state
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);
  const [checkingStrength, setCheckingStrength] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    homeAddress: '',
    workAddress: '',
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: true,
    language: 'sv' as 'sv' | 'en'
  });

  // Password change states
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Initialize form data
  useEffect(() => {
    if (userProfile) {
      setFormData({
        name: userProfile.profile.name || '',
        phone: userProfile.profile.phone || '',
        homeAddress: userProfile.profile.preferences.defaultAddresses.home?.address || '',
        workAddress: userProfile.profile.preferences.defaultAddresses.work?.address || '',
        emailNotifications: userProfile.profile.preferences.notifications.email,
        smsNotifications: userProfile.profile.preferences.notifications.sms,
        pushNotifications: userProfile.profile.preferences.notifications.push,
        language: userProfile.profile.preferences.language
      });
    }
  }, [userProfile]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = async () => {
    if (!userProfile) return;
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    setRateLimitInfo(null);

    try {
      // Use new API client
      await authApiClient.updateProfile({
        name: formData.name,
        phone: formData.phone,
        preferences: {
          defaultAddresses: {
            home: formData.homeAddress ? {
              address: formData.homeAddress
            } : undefined,
            work: formData.workAddress ? {
              address: formData.workAddress
            } : undefined
          },
          notifications: {
            email: formData.emailNotifications,
            sms: formData.smsNotifications,
            push: formData.pushNotifications
          },
          language: formData.language
        }
      });

      setSuccess('Profil uppdaterad!');
      setIsEditing(false);
      onProfileUpdate();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      
      if (error instanceof RateLimitError) {
        setRateLimitInfo({ resetIn: error.resetIn });
        setError(`För många försök. Försök igen om ${error.resetIn} sekunder.`);
      } else if (error instanceof AuthApiError) {
        setError(error.message);
      } else {
        setError('Kunde inte uppdatera profil. Försök igen.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Check password strength in real-time
  const checkPasswordStrength = async (password: string) => {
    if (!password || password.length < 3) {
      setPasswordStrength(null);
      return;
    }

    setCheckingStrength(true);
    try {
      const strength = await authApiClient.checkPasswordStrength(password);
      setPasswordStrength(strength);
    } catch (error) {
      console.error('Error checking password strength:', error);
      setPasswordStrength(null);
    } finally {
      setCheckingStrength(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Lösenorden matchar inte');
      return;
    }

    if (passwordStrength && passwordStrength.score < 4) {
      setError('Lösenordet är för svagt. Följ rekommendationerna ovan.');
      return;
    }

    setIsLoading(true);
    setError('');
    setRateLimitInfo(null);

    try {
      const result = await authApiClient.changePassword(
        passwordData.currentPassword, 
        passwordData.newPassword
      );
      
      setSuccess(`Lösenord ändrat! Säkerhetsnivå: ${result.strengthScore}/6`);
      setShowPasswordChange(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordStrength(null);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error changing password:', error);
      
      if (error instanceof RateLimitError) {
        setRateLimitInfo({ resetIn: error.resetIn });
        setError(`För många lösenordsförsök. Försök igen om ${error.resetIn} sekunder.`);
      } else if (error instanceof AuthApiError) {
        if (error.code === 'WEAK_PASSWORD') {
          setError('Lösenordet är för svagt enligt säkerhetspolicyn');
        } else {
          setError(error.message);
        }
      } else {
        setError('Kunde inte ändra lösenord. Försök igen.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p className="text-white/70">Laddar profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white/95">Min Profil</h1>
          <p className="text-white/60 text-sm mt-1">Hantera din profil och inställningar</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${userProfile.emailVerified ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          <span className="text-white/70 text-sm">
            {userProfile.emailVerified ? 'Verifierad' : 'Inte verifierad'}
          </span>
        </div>
      </div>

      {/* Success/Error messages */}
      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
          <p className="text-green-400 text-sm">{success}</p>
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-red-400 text-sm">{error}</p>
          {rateLimitInfo && rateLimitInfo.resetIn && (
            <div className="mt-2 text-xs text-red-300">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin"></div>
                <span>Försök igen om {rateLimitInfo.resetIn} sekunder</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Profile Card */}
      <div className="rounded-2xl p-6 bg-white/5 border border-white/10 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-white/90">Personlig Information</h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white/95 transition-colors"
            >
              Redigera
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Namn</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                placeholder="Ditt namn"
              />
            ) : (
              <p className="text-white/90">{userProfile.profile.name}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Telefon</label>
            {isEditing ? (
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                placeholder="+46 70 123 45 67"
              />
            ) : (
              <p className="text-white/90">{userProfile.profile.phone || 'Inte angivet'}</p>
            )}
          </div>

          {/* Email (read-only) */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-white/70 mb-2">E-post</label>
            <div className="flex items-center gap-2">
              <p className="text-white/90">{userProfile.email}</p>
              {!userProfile.emailVerified && (
                <span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded-full">
                  Inte verifierad
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Default Addresses */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white/80">Standardadresser</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Hemadress</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.homeAddress}
                  onChange={(e) => handleInputChange('homeAddress', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                  placeholder="Din hemadress"
                />
              ) : (
                <p className="text-white/90">{userProfile.profile.preferences.defaultAddresses.home?.address || 'Inte angivet'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Arbetsadress</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.workAddress}
                  onChange={(e) => handleInputChange('workAddress', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                  placeholder="Din arbetsadress"
                />
              ) : (
                <p className="text-white/90">{userProfile.profile.preferences.defaultAddresses.work?.address || 'Inte angivet'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white/80">Notifikationsinställningar</h3>
          
          <div className="space-y-3">
            {isEditing ? (
              <>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.emailNotifications}
                    onChange={(e) => handleInputChange('emailNotifications', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-white/5 border-white/20 rounded focus:ring-blue-500"
                  />
                  <span className="text-white/80">E-postnotifikationer</span>
                </label>
                
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.smsNotifications}
                    onChange={(e) => handleInputChange('smsNotifications', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-white/5 border-white/20 rounded focus:ring-blue-500"
                  />
                  <span className="text-white/80">SMS-notifikationer</span>
                </label>
                
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.pushNotifications}
                    onChange={(e) => handleInputChange('pushNotifications', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-white/5 border-white/20 rounded focus:ring-blue-500"
                  />
                  <span className="text-white/80">Push-notifikationer</span>
                </label>
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-white/70 text-sm">
                  E-post: {userProfile.profile.preferences.notifications.email ? 'Aktiverat' : 'Inaktiverat'}
                </p>
                <p className="text-white/70 text-sm">
                  SMS: {userProfile.profile.preferences.notifications.sms ? 'Aktiverat' : 'Inaktiverat'}
                </p>
                <p className="text-white/70 text-sm">
                  Push: {userProfile.profile.preferences.notifications.push ? 'Aktiverat' : 'Inaktiverat'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {isEditing && (
          <div className="flex items-center gap-3 pt-4 border-t border-white/10">
            <button
              onClick={handleSaveProfile}
              disabled={isLoading}
              className="px-6 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Sparar...' : 'Spara ändringar'}
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setError('');
                // Reset form data
                if (userProfile) {
                  setFormData({
                    name: userProfile.profile.name || '',
                    phone: userProfile.profile.phone || '',
                    homeAddress: userProfile.profile.preferences.defaultAddresses.home?.address || '',
                    workAddress: userProfile.profile.preferences.defaultAddresses.work?.address || '',
                    emailNotifications: userProfile.profile.preferences.notifications.email,
                    smsNotifications: userProfile.profile.preferences.notifications.sms,
                    pushNotifications: userProfile.profile.preferences.notifications.push,
                    language: userProfile.profile.preferences.language
                  });
                }
              }}
              className="px-6 py-2 text-white/70 hover:text-white/90 transition-colors"
            >
              Avbryt
            </button>
          </div>
        )}
      </div>

      {/* Security Card */}
      <div className="rounded-2xl p-6 bg-white/5 border border-white/10 space-y-4">
        <h2 className="text-lg font-medium text-white/90">Säkerhet</h2>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80">Lösenord</p>
            <p className="text-white/60 text-sm">Ändra ditt lösenord</p>
          </div>
          <button
            onClick={() => setShowPasswordChange(!showPasswordChange)}
            className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white/95 transition-colors"
          >
            {showPasswordChange ? 'Dölj' : 'Ändra'}
          </button>
        </div>

        {showPasswordChange && (
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Nuvarande lösenord</label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                placeholder="Ditt nuvarande lösenord"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Nytt lösenord</label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => {
                  const newPassword = e.target.value;
                  setPasswordData(prev => ({ ...prev, newPassword }));
                  
                  // Check strength with debounce
                  clearTimeout((window as any).passwordStrengthTimeout);
                  (window as any).passwordStrengthTimeout = setTimeout(() => {
                    checkPasswordStrength(newPassword);
                  }, 500);
                }}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                placeholder="Nytt lösenord (minst 8 tecken)"
              />
              
              {/* Password Strength Indicator */}
              {passwordData.newPassword && (
                <div className="mt-3 space-y-2">
                  {checkingStrength ? (
                    <div className="flex items-center gap-2 text-white/60 text-sm">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white/60 rounded-full animate-spin"></div>
                      <span>Kontrollerar lösenordsstyrka...</span>
                    </div>
                  ) : passwordStrength ? (
                    <>
                      {/* Strength Bar */}
                      <div className="flex items-center gap-2">
                        <span className="text-white/70 text-sm">Styrka:</span>
                        <div className="flex-1 bg-white/10 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              passwordStrength.level === 'weak' ? 'bg-red-500' :
                              passwordStrength.level === 'medium' ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${(passwordStrength.score / passwordStrength.maxScore) * 100}%` }}
                          />
                        </div>
                        <span className={`text-sm font-medium ${
                          passwordStrength.level === 'weak' ? 'text-red-400' :
                          passwordStrength.level === 'medium' ? 'text-yellow-400' :
                          'text-green-400'
                        }`}>
                          {passwordStrength.level === 'weak' ? 'Svagt' :
                           passwordStrength.level === 'medium' ? 'Medel' : 'Starkt'}
                        </span>
                      </div>
                      
                      {/* Feedback */}
                      {passwordStrength.feedback.length > 0 && (
                        <div className="text-xs text-white/60">
                          <p className="mb-1">För att förbättra:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {passwordStrength.feedback.map((feedback, index) => (
                              <li key={index}>{feedback}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Score Display */}
                      <div className="flex items-center gap-2 text-xs text-white/50">
                        <span>Poäng: {passwordStrength.score}/{passwordStrength.maxScore}</span>
                        {passwordStrength.score >= 4 && (
                          <span className="text-green-400">✓ Godkänt</span>
                        )}
                      </div>
                    </>
                  ) : null}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Bekräfta nytt lösenord</label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                placeholder="Bekräfta nytt lösenord"
              />
            </div>
            
            <button
              onClick={handlePasswordChange}
              disabled={isLoading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
              className="px-6 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Ändrar...' : 'Ändra lösenord'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
