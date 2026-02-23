import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Platform } from 'react-native';

/**
 * Upload a profile picture for the current user
 * @param userId - The user's ID
 * @param file - The image file to upload (from image picker)
 * @param fileExtension - The file extension (jpg, png, webp, etc.)
 * @returns The public URL of the uploaded image or error
 */
export const uploadProfilePicture = async (userId, file, fileExtension = 'jpg') => {
  try {
    const fileName = `${userId}/profile.${fileExtension}`;

    let fileToUpload;
    let contentType =
      file.type ||
      (fileExtension === 'jpg' ? 'image/jpeg' : `image/${fileExtension}`);

    console.log('Preparing file for upload. URI:', file.uri, 'Type:', contentType);

    // For web: convert data URI or blob URL to ArrayBuffer
    if (Platform.OS === 'web' && (file.uri.startsWith('data:') || file.uri.startsWith('http://') || file.uri.startsWith('blob:'))) {
      console.log('Web detected - fetching blob and converting to ArrayBuffer');
      const response = await fetch(file.uri);
      const blob = await response.blob();
      contentType = blob.type || contentType;
      fileToUpload = await blob.arrayBuffer();
      console.log('ArrayBuffer created. Type:', contentType, 'Size:', fileToUpload.byteLength);
    } else {
      // For native (React Native): read file as base64, then decode to ArrayBuffer
      // This is the recommended approach for Supabase Storage in React Native
      console.log('Native detected - reading file as base64');
      
      try {
        const base64 = await FileSystem.readAsStringAsync(file.uri, {
          encoding: 'base64',
        });
        
        if (!base64 || base64.length === 0) {
          return {
            url: null,
            error: new Error(
              'Selected image could not be read (empty file). Please try a different photo.'
            ),
          };
        }
        
        console.log('Base64 read successfully. Length:', base64.length);
        
        // Decode base64 to ArrayBuffer
        fileToUpload = decode(base64);
        console.log('ArrayBuffer created from base64. Size:', fileToUpload.byteLength);
        
        if (fileToUpload.byteLength === 0) {
          return {
            url: null,
            error: new Error(
              'Selected image could not be decoded (empty ArrayBuffer). Please try a different photo.'
            ),
          };
        }
      } catch (readError) {
        console.log('Error reading file:', readError);
        return {
          url: null,
          error: new Error(
            `Failed to read image file: ${readError instanceof Error ? readError.message : 'Unknown error'}`
          ),
        };
      }
    }

    console.log('Uploading to Supabase Storage. FileName:', fileName, 'ContentType:', contentType);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('profile-pictures')
      .upload(fileName, fileToUpload, {
        cacheControl: '3600',
        upsert: true, // Replace existing file
        contentType: contentType,
      });

    if (error) {
      console.log('Error uploading profile picture:', error);
      return { url: null, error };
    }

    console.log('✅ Upload successful! Storage data:', data);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;
    console.log('✅ Public URL generated:', publicUrl);

    // Update user profile with the picture URL
    console.log('Updating profiles table with new picture URL for user:', userId);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ profile_picture_url: publicUrl })
      .eq('id', userId);

    if (updateError) {
      console.log('❌ Error updating profile with picture URL:', updateError);
      // Return error since the database update failed
      return { url: null, error: updateError };
    } else {
      console.log('✅ Profile database updated successfully with picture URL');
    }

    return { url: publicUrl, error: null };
  } catch (error) {
    console.log('Unexpected error uploading profile picture:', error);
    return { url: null, error: error };
  }
};

/**
 * Get the profile picture URL for a user
 * @param userId - The user's ID
 * @returns The public URL of the profile picture
 */
export const getProfilePictureUrl = (userId) => {
  if (!userId) return null;

  // Try common extensions
  const extensions = ['jpg', 'jpeg', 'png', 'webp'];
  
  // Return the first one (we use jpg as default, but support others)
  const fileName = `${userId}/profile.jpg`;
  
  const { data } = supabase.storage
    .from('profile-pictures')
    .getPublicUrl(fileName);

  return data.publicUrl;
};

/**
 * Download the profile picture for a user
 * @param userId - The user's ID
 * @returns The file blob or error
 */
export const downloadProfilePicture = async (userId) => {
  try {
    const fileName = `${userId}/profile.jpg`;

    const { data, error } = await supabase.storage
      .from('profile-pictures')
      .download(fileName);

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error };
  }
};

/**
 * Delete the profile picture for a user
 * @param userId - The user's ID
 * @returns Success or error
 */
export const deleteProfilePicture = async (userId) => {
  try {
    // Try to delete all possible extensions
    const extensions = ['jpg', 'jpeg', 'png', 'webp'];
    const filesToDelete = extensions.map(ext => `${userId}/profile.${ext}`);

    const { data, error } = await supabase.storage
      .from('profile-pictures')
      .remove(filesToDelete);

    if (error) {
      console.log('Error deleting profile picture:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.log('Unexpected error deleting profile picture:', error);
    return { success: false, error: error };
  }
};

/**
 * Check if a user has a profile picture
 * @param userId - The user's ID
 * @returns True if profile picture exists
 */
export const hasProfilePicture = async (userId) => {
  try {
    const extensions = ['jpg', 'jpeg', 'png', 'webp'];
    
    for (const ext of extensions) {
      const fileName = `${userId}/profile.${ext}`;
      const { data, error } = await supabase.storage
        .from('profile-pictures')
        .list(userId, {
          search: `profile.${ext}`,
        });

      if (!error && data && data.length > 0) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.log('Error checking for profile picture:', error);
    return false;
  }
};
