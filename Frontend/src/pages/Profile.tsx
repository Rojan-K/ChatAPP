import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/authContext';
import { useNavigate } from 'react-router-dom';
import '../styles/Profile.css';
import { 
  Person, 
  ArrowBack,
  Camera,
  Edit,
  Save,
  Cancel
} from '@mui/icons-material';
import { useUpdateProfileMutation } from '../lib/api';

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [updateProfile, { isLoading, error }] = useUpdateProfileMutation();
  
  const [isEditing, setIsEditing] = useState(false);
  const [profilePic, setProfilePic] = useState<string>('');
  const [formData, setFormData] = useState({
    name: user?.Fullname || '',
    email: user?.Email || ''
  });
  const [tempFormData, setTempFormData] = useState({
    name: user?.Fullname || '',
    email: user?.Email || ''
  });

  useEffect(() => {
    if (user?.profilePic) {
      setProfilePic(user.profilePic);
    }
  }, [user]);

  const handleBackToChat = () => {
    navigate('/home');
  };

  const handleEditProfile = () => {
    setTempFormData({
      name: formData.name,
      email: formData.email
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setTempFormData({
      name: formData.name,
      email: formData.email
    }); 
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    try {
      // Make API call to update profile in database
      const result = await updateProfile({
        Fullname: tempFormData.name,
        Email: tempFormData.email,
        profilePic: profilePic
      }).unwrap();

      if (result.success) {
        // Update local context with the new data
        if (updateUser) {
          await updateUser({
            Fullname: tempFormData.name,
            Email: tempFormData.email,
            profilePic: profilePic
          });
        }
        
        setFormData({
          name: tempFormData.name,
          email: tempFormData.email
        });
        setIsEditing(false);
      } else {
        alert(result.message || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      if (error.data?.message) {
        alert(error.data.message);
      } else {
        alert('Failed to update profile. Please try again.');
      }
    }
  };

  const handleProfilePicClick = () => {
    if (isEditing) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          setProfilePic(result);
        };
        reader.readAsDataURL(file);
      } else {
        alert('Please select an image file');
      }
    }
  };

  const handleInputChange = (field: 'name' | 'email', value: string) => {
    setTempFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <button className="back-button" onClick={handleBackToChat}>
          <ArrowBack />
          <span>Back to Chat</span>
        </button>
        <h1>My Profile</h1>
      </div>

      <div className="profile-content">
        <div className="profile-card">
          {/* Profile Picture Section */}
          <div className="profile-picture-section">
            <div className="profile-picture-container" onClick={handleProfilePicClick}>
              {profilePic ? (
                <img src={profilePic} alt="Profile" className="profile-picture" />
              ) : (
                <div className="profile-picture-placeholder">
                  <Person />
                  <span>{getInitials(formData.name)}</span>
                </div>
              )}
              {isEditing && (
                <div className="camera-overlay">
                  <Camera />
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            {isEditing && (
              <p className="upload-hint">Click to change profile picture</p>
            )}
          </div>

          {/* Profile Information Section */}
          <div className="profile-info-section">
            <div className="info-header">
              <h2>Profile Information</h2>
              {!isEditing ? (
                <button className="edit-button" onClick={handleEditProfile}>
                  <Edit />
                  <span>Edit</span>
                </button>
              ) : (
                <div className="edit-actions">
                  <button className="save-button" onClick={handleSaveProfile} disabled={isLoading}>
                    <Save />
                    <span>{isLoading ? 'Saving...' : 'Save'}</span>
                  </button>
                  <button className="cancel-button" onClick={handleCancelEdit}>
                    <Cancel />
                    <span>Cancel</span>
                  </button>
                </div>
              )}
            </div>

            <div className="info-fields">
              <div className="field-group">
                <label htmlFor="name">Full Name</label>
                {isEditing ? (
                  <input
                    id="name"
                    type="text"
                    value={tempFormData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="field-input"
                    placeholder="Enter your full name"
                  />
                ) : (
                  <div className="field-value">{formData.name}</div>
                )}
              </div>

              <div className="field-group">
                <label htmlFor="email">Email Address</label>
                {isEditing ? (
                  <input
                    id="email"
                    type="email"
                    value={tempFormData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="field-input"
                    placeholder="Enter your email"
                  />
                ) : (
                  <div className="field-value">{formData.email}</div>
                )}
              </div>
            </div>
          </div>

          {/* Additional Profile Sections */}
          <div className="additional-sections">
            <div className="section">
              <h3>Account Settings</h3>
              <div className="section-content">
                <div className="setting-item">
                  <span>Account Status</span>
                  <span className="status active">Active</span>
                </div>
                <div className="setting-item">
                  <span>Member Since</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
