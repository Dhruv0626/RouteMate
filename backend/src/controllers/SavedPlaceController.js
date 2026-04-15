import SavedPlace from "../models/SavedPlace.js";

/**
 * @desc    Add a new saved place
 * @route   POST /api/saved-places
 * @access  Private (Passenger)
 */
export const addPlace = async (req, res, next) => {
  try {
    const { title, address, coordinates, type } = req.body;

    // Validation
    if (!title || !address || !coordinates || coordinates.length !== 2) {
      return res.status(400).json({
        success: false,
        message: "Please provide title, address and valid coordinates [lng, lat].",
      });
    }

    const newPlace = await SavedPlace.create({
      user: req.user._id,
      title,
      address,
      location: {
        type: "Point",
        coordinates,
      },
      type,
    });

    res.status(201).json({
      success: true,
      data: newPlace,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all saved places for the authenticated user
 * @route   GET /api/saved-places
 * @access  Private
 */
export const getPlaces = async (req, res, next) => {
  try {
    const places = await SavedPlace.find({ user: req.user._id }).sort("-createdAt");

    res.status(200).json({
      success: true,
      count: places.length,
      data: places,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update a saved place
 * @route   PUT /api/saved-places/:id
 * @access  Private
 */
export const updatePlace = async (req, res, next) => {
  try {
    let place = await SavedPlace.findById(req.params.id);

    if (!place) {
      return res.status(404).json({ success: false, message: "Place not found." });
    }

    // Check ownership
    if (place.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: "Not authorized." });
    }

    const { title, address, coordinates, type } = req.body;
    
    const updateData = {};
    if (title) updateData.title = title;
    if (address) updateData.address = address;
    if (type) updateData.type = type;
    if (coordinates && coordinates.length === 2) {
      updateData.location = { type: "Point", coordinates };
    }

    place = await SavedPlace.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: place,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete a saved place
 * @route   DELETE /api/saved-places/:id
 * @access  Private
 */
export const deletePlace = async (req, res, next) => {
  try {
    const place = await SavedPlace.findById(req.params.id);

    if (!place) {
      return res.status(404).json({ success: false, message: "Place not found." });
    }

    // Check ownership
    if (place.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: "Not authorized." });
    }

    await place.deleteOne();

    res.status(200).json({
      success: true,
      message: "Saved place removed successfully.",
    });
  } catch (err) {
    next(err);
  }
};
