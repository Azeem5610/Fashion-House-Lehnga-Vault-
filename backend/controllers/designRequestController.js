const DesignRequest = require("../models/DesignRequest");
const { cloudinary } = require("../config/cloudinary");

// CREATE design request (customer uploads reference images)
exports.createDesignRequest = async (req, res) => {
  try {
    const { description, requestType } = req.body;

    const images = req.files
      ? req.files.map((f) => ({ url: f.path, public_id: f.filename }))
      : [];

    if (images.length === 0) {
      return res.status(400).json({ message: "Please upload at least one reference image" });
    }

    const request = await DesignRequest.create({
      user: req.user.id,
      images,
      description,
      requestType: requestType || "exact-copy",
    });

    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET my design requests (customer)
exports.getMyDesignRequests = async (req, res) => {
  try {
    const requests = await DesignRequest.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET all design requests (admin)
exports.getAllDesignRequests = async (req, res) => {
  try {
    const requests = await DesignRequest.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE design request status (admin)
exports.updateDesignRequestStatus = async (req, res) => {
  try {
    const request = await DesignRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Design request not found" });

    request.status = req.body.status;
    await request.save();

    const populated = await request.populate("user", "name email");
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
