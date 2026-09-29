import { useState, useEffect, useCallback } from 'react';
import {
  createUserProfile,
  getUserProfile,
  updateUserProfile,
} from '../services/api';

const STORAGE_KEY = 'ai_placement_agent_user_id';

const defaultProfile = {
  name: '',
  email: '',
  degree: '',
  specialization: '',
  skills: [
    { name: 'Python', level: 'intermediate' },
    { name: 'SQL', level: 'intermediate' },
  ],
  targetRole: 'Data Scientist',
  targetCompanies: ['Google', 'Amazon'],
  experienceLevel: 'Student',
  leetcodeSolved: 0,
  weakAreas: ['System Design'],
};

export function useProfile() {
  const [profile, setProfile] = useState(defaultProfile);
  const [activeUserId, setActiveUserId] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [isLoading, setIsLoading] = useState(() => Boolean(localStorage.getItem(STORAGE_KEY)));
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch active user profile from backend on mount
  useEffect(() => {
    let isMounted = true;
    const storedId = localStorage.getItem(STORAGE_KEY);

    if (storedId) {
      getUserProfile(storedId)
        .then((data) => {
          if (isMounted && data) {
            setProfile(data);
            setActiveUserId(data.id);
          }
        })
        .catch((err) => {
          console.warn('Could not load stored profile, starting fresh:', err.message);
          if (isMounted) {
            // If stored ID was deleted or not found, clear stale ID
            localStorage.removeItem(STORAGE_KEY);
            setActiveUserId('');
          }
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const saveProfile = useCallback(
    async (formData) => {
      setIsLoading(true);
      setError(null);
      setSuccessMessage('');

      try {
        let saved;
        if (activeUserId) {
          saved = await updateUserProfile(activeUserId, formData);
          setSuccessMessage('Profile updated and synced with AI Co-Pilot!');
        } else {
          saved = await createUserProfile(formData);
          setSuccessMessage('Profile created and synced with AI Co-Pilot!');
        }

        setProfile(saved);
        setActiveUserId(saved.id);
        localStorage.setItem(STORAGE_KEY, saved.id);
        return saved;
      } catch (err) {
        console.error('Failed to save profile:', err);
        setError(err.message || 'Failed to save profile.');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [activeUserId]
  );

  const clearProfile = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setActiveUserId('');
    setProfile(defaultProfile);
    setError(null);
    setSuccessMessage('');
  }, []);

  return {
    profile,
    activeUserId,
    isLoading,
    error,
    successMessage,
    saveProfile,
    clearProfile,
    setSuccessMessage,
  };
}
