import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Platform } from 'react-native';

/**
 * Sends a profile pic up to Supabase Storage — basically changing your in-game skin
 * @param userId - who's getting the new look
 * @param file - the raw image object from the picker (fresh off the camera roll)
 * @param fileExtension - jpg, png, webp... pick your fighter
 * @returns the public URL of the uploaded image, or an error if things go sideways
 */
export const uploadProfilePicture = async (userId, file, fileExtension = 'jpg') => {
  try {
    const fileName = `${userId}/profile.${fileExtension}`;

    let fileToUpload;
    let contentType =
      file.type ||
      (fileExtension === 'jpg' ? 'image/jpeg' : `image/${fileExtension}`);

    console.log('Preparing file for upload. URI:', file.uri, 'Type:', contentType);

    // Web: convert the URI to an ArrayBuffer — Supabase wants raw binary, not a URL
    if (Platform.OS === 'web' && (file.uri.startsWith('data:') || file.uri.startsWith('http://') || file.uri.startsWith('blob:'))) {
      console.log('Web detected - fetching blob and converting to ArrayBuffer');
      const response = await fetch(file.uri);
      const blob = await response.blob();
      contentType = blob.type || contentType;
      fileToUpload = await blob.arrayBuffer();
      console.log('ArrayBuffer created. Type:', contentType, 'Size:', fileToUpload.byteLength);
    } else {
      // Native: base64-encode the file, then decode into an ArrayBuffer
      // this is the Supabase-approved method for React Native uploads
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
        
        // translate base64 → ArrayBuffer (Supabase's preferred dialect for file data)
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

    // yeet the file up to Supabase Storage — godspeed, little image
    const { data, error } = await supabase.storage
      .from('profile-pictures')
      .upload(fileName, fileToUpload, {
        cacheControl: '3600',
        upsert: true, // replace existing pic if there is one — glow-up season never stops
        contentType: contentType,
      });

    if (error) {
      console.log('Error uploading profile picture:', error);
      return { url: null, error };
    }

    console.log('✅ Upload successful! Storage data:', data);

    // get the public URL so anyone in the app can see this masterpiece
    const { data: urlData } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;
    console.log('✅ Public URL generated:', publicUrl);

    // persist the URL in the user's profile row so we can find it later
    console.log('Updating profiles table with new picture URL for user:', userId);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ profile_picture_url: publicUrl })
      .eq('id', userId);

    if (updateError) {
      console.log('❌ Error updating profile with picture URL:', updateError);
      // pic made it to storage but the profile table update choked — so close yet so far
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
 * Grab the URL for someone's profile pic — like peeking at their Discord avatar
 * @param userId - whose pic do we want?
 * @returns the public URL pointing to their profile picture
 */
export const getProfilePictureUrl = (userId) => {
  if (!userId) return null;

  // supported formats — if your file type isn't on this list, no entry
  const extensions = ['jpg', 'jpeg', 'png', 'webp'];
  
  // default to jpg — the universally accepted image format, never lets you down
  const fileName = `${userId}/profile.jpg`;
  
  const { data } = supabase.storage
    .from('profile-pictures')
    .getPublicUrl(fileName);

  return data.publicUrl;
};

/**
 * Pull down a user's profile pic as a blob — for when you need the raw image data
 * @param userId - whose pic are we downloading?
 * @returns the image blob, or an error if it's not there
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
 * Wipe a user's profile pic from storage — complete digital makeover reset
 * @param userId - whose pic is getting yeeted into the void?
 * @returns success flag or an error if the deletion failed
 */
export const deleteProfilePicture = async (userId) => {
  try {
    // nuke every possible extension variant — leave no survivors
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
 * Check whether a user actually uploaded a profile pic or is still on default
 * @param userId - the user in question
 * @returns true if they've got a custom pic, false if they're still a silhouette
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
