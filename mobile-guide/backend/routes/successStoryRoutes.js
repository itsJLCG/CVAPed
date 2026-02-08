/**
 * Success Story Routes
 * Handles CRUD operations for success stories
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { ObjectId } = require('mongodb');
const { authenticateToken, therapistOnly } = require('../middleware/auth');
const cloudinary = require('../config/cloudinary');

// Configure multer for memory storage (Cloudinary uploads from buffer)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PNG, JPG, JPEG, GIF, and WEBP are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Helper function to upload image to Cloudinary
const uploadToCloudinary = (fileBuffer, filename) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'success_stories',
        public_id: `${Date.now()}_${filename}`,
        resource_type: 'image'
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );
    uploadStream.end(fileBuffer);
  });
};

// Helper function to delete image from Cloudinary
const deleteFromCloudinary = async (imageUrl) => {
  try {
    // Extract public_id from URL
    const urlParts = imageUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    const publicId = `success_stories/${filename.split('.')[0]}`;
    
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    return false;
  }
};

// Helper function to get database collection
// Helper function to get database collection
const getSuccessStoriesCollection = (req) => {
  if (!req.app.locals.db) {
    throw new Error('Database not initialized');
  }
  return req.app.locals.db.collection('success_stories');
};

/**
 * GET /api/success-stories
 * Get all success stories (Public endpoint)
 */
router.get('/', async (req, res) => {
  try {
    const successStoriesCollection = getSuccessStoriesCollection(req);
    const stories = await successStoriesCollection
      .find()
      .sort({ createdAt: -1 })
      .toArray();

    // Convert ObjectId to string
    const formattedStories = stories.map(story => ({
      ...story,
      _id: story._id.toString(),
      id: story._id.toString()
    }));

    res.json({
      success: true,
      data: formattedStories,
      count: formattedStories.length
    });
  } catch (error) {
    console.error('Error fetching success stories:', error);
    res.status(500).json({
      success: false,
      message: `Failed to fetch success stories: ${error.message}`
    });
  }
});

/**
 * POST /api/success-stories
 * Create a new success story (Therapist only)
 */
router.post('/', authenticateToken, therapistOnly, upload.array('images', 10), async (req, res) => {
  try {
    console.log('📝 Success story creation request received');
    console.log('Files count:', req.files ? req.files.length : 0);
    console.log('Request body:', req.body);
    
    const successStoriesCollection = getSuccessStoriesCollection(req);
    const { patientName, story } = req.body;

    // Validation
    if (!patientName || !patientName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Patient name is required'
      });
    }

    if (!story || !story.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Success story content is required'
      });
    }

    // Upload images to Cloudinary
    const uploadedImages = [];
    const failedUploads = [];
    
    if (req.files && req.files.length > 0) {
      console.log(`📤 Uploading ${req.files.length} images to Cloudinary...`);
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        try {
          console.log(`Uploading ${i + 1}/${req.files.length}: ${file.originalname}, size: ${file.size} bytes`);
          const imageUrl = await uploadToCloudinary(file.buffer, file.originalname);
          console.log(`✅ Uploaded successfully: ${imageUrl}`);
          uploadedImages.push(imageUrl);
        } catch (uploadError) {
          console.error(`❌ Error uploading image ${file.originalname}:`, uploadError.message);
          failedUploads.push(file.originalname);
        }
      }
    }

    console.log(`Total images uploaded: ${uploadedImages.length}, Failed: ${failedUploads.length}`);

    // Create success story document
    const successStory = {
      patientName: patientName.trim(),
      images: uploadedImages,
      story: story.trim(),
      createdBy: req.user.email,
      createdByName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await successStoriesCollection.insertOne(successStory);
    
    const insertedStory = {
      ...successStory,
      _id: result.insertedId.toString(),
      id: result.insertedId.toString()
    };

    const responseMessage = failedUploads.length > 0
      ? `Success story created. ${uploadedImages.length} images uploaded, ${failedUploads.length} failed.`
      : 'Success story created successfully';

    res.status(201).json({
      success: true,
      message: responseMessage,
      data: insertedStory,
      warnings: failedUploads.length > 0 ? `Failed to upload: ${failedUploads.join(', ')}` : null
    });
  } catch (error) {
    console.error('Error creating success story:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: `Failed to create success story: ${error.message}`
    });
  }
});

/**
 * PUT /api/success-stories/:id
 * Update an existing success story (Therapist only)
 */
router.put('/:id', authenticateToken, therapistOnly, upload.array('images', 10), async (req, res) => {
  try {
    const successStoriesCollection = getSuccessStoriesCollection(req);
    const { id } = req.params;
    const { patientName, story } = req.body;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid story ID'
      });
    }

    // Check if story exists
    const existingStory = await successStoriesCollection.findOne({ _id: new ObjectId(id) });
    if (!existingStory) {
      return res.status(404).json({
        success: false,
        message: 'Success story not found'
      });
    }

    // Validation
    if (!patientName || !patientName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Patient name is required'
      });
    }

    if (!story || !story.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Success story content is required'
      });
    }

    // Process new uploaded images to Cloudinary
    let uploadedImages = existingStory.images || [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const imageUrl = await uploadToCloudinary(file.buffer, file.originalname);
          uploadedImages.push(imageUrl);
        } catch (uploadError) {
          console.error('Error uploading image to Cloudinary:', uploadError);
        }
      }
    }

    // Update document
    const updateData = {
      patientName: patientName.trim(),
      images: uploadedImages,
      story: story.trim(),
      updatedAt: new Date(),
      updatedBy: req.user.email,
      updatedByName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim()
    };

    await successStoriesCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    // Get updated story
    const updatedStory = await successStoriesCollection.findOne({ _id: new ObjectId(id) });

    res.json({
      success: true,
      message: 'Success story updated successfully',
      data: {
        ...updatedStory,
        _id: updatedStory._id.toString(),
        id: updatedStory._id.toString()
      }
    });
  } catch (error) {
    console.error('Error updating success story:', error);
    res.status(500).json({
      success: false,
      message: `Failed to update success story: ${error.message}`
    });
  }
});

/**
 * DELETE /api/success-stories/:id
 * Delete a success story (Therapist only)
 */
router.delete('/:id', authenticateToken, therapistOnly, async (req, res) => {
  try {
    const successStoriesCollection = getSuccessStoriesCollection(req);
    const { id } = req.params;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid story ID'
      });
    }

    // Check if story exists
    const story = await successStoriesCollection.findOne({ _id: new ObjectId(id) });
    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Success story not found'
      });
    }

    // Delete associated images from Cloudinary
    if (story.images && story.images.length > 0) {
      for (const imageUrl of story.images) {
        await deleteFromCloudinary(imageUrl);
      }
    }

    // Delete story from database
    await successStoriesCollection.deleteOne({ _id: new ObjectId(id) });

    res.json({
      success: true,
      message: 'Success story deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting success story:', error);
    res.status(500).json({
      success: false,
      message: `Failed to delete success story: ${error.message}`
    });
  }
});

/**
 * POST /api/success-stories/:id/remove-image
 * Remove a specific image from a success story (Therapist only)
 */
router.post('/:id/remove-image', authenticateToken, therapistOnly, async (req, res) => {
  try {
    const successStoriesCollection = getSuccessStoriesCollection(req);
    const { id } = req.params;
    const { imagePath } = req.body;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid story ID'
      });
    }

    if (!imagePath) {
      return res.status(400).json({
        success: false,
        message: 'Image path is required'
      });
    }

    // Check if story exists
    const story = await successStoriesCollection.findOne({ _id: new ObjectId(id) });
    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Success story not found'
      });
    }

    // Check if image exists in story
    if (!story.images || !story.images.includes(imagePath)) {
      return res.status(404).json({
        success: false,
        message: 'Image not found in story'
      });
    }

    // Delete image from Cloudinary
    await deleteFromCloudinary(imagePath);

    // Update database - remove image from array
    await successStoriesCollection.updateOne(
      { _id: new ObjectId(id) },
      { $pull: { images: imagePath } }
    );

    res.json({
      success: true,
      message: 'Image removed successfully'
    });
  } catch (error) {
    console.error('Error removing image:', error);
    res.status(500).json({
      success: false,
      message: `Failed to remove image: ${error.message}`
    });
  }
});

module.exports = router;
