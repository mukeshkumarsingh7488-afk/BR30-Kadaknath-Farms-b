import WhatsNew from "../models/WhatsNew.js";
import WhatsNewView from "../models/WhatsNewView.js";

const STAFF_ROLES = ["admin", "staff", "fm", "security"];

const slugify = (value) => {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const createUniqueSlug = async (title, excludeId = null) => {
  const baseSlug = slugify(title) || `feature-${Date.now()}`;

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query = { slug };

    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const existing = await WhatsNew.findOne(query).select("_id");

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
};

const isTargetedToUser = (feature, role) => {
  if (!Array.isArray(feature.targetRoles)) {
    return true;
  }

  if (feature.targetRoles.includes("all")) {
    return true;
  }

  return feature.targetRoles.includes(role);
};

const getVisibleFeatures = async (req) => {
  const now = new Date();

  const features = await WhatsNew.find({
    published: true,
    active: true,
    $or: [{ publishAt: null }, { publishAt: { $lte: now } }],
  })
    .sort({
      order: 1,
      createdAt: -1,
    })
    .lean();

  const role = req.user.role;

  const targetedFeatures = features.filter((feature) => isTargetedToUser(feature, role));

  if (targetedFeatures.length === 0) {
    return [];
  }

  const featureIds = targetedFeatures.map((feature) => feature._id);

  const views = await WhatsNewView.find({
    user: req.user._id,
    whatsNew: { $in: featureIds },
  }).lean();

  const viewMap = new Map();

  views.forEach((view) => {
    viewMap.set(`${view.whatsNew.toString()}_${view.version}`, view);
  });

  const result = [];

  for (const feature of targetedFeatures) {
    const key = `${feature._id.toString()}_${feature.version}`;

    const tracking = viewMap.get(key);

    let shouldShow = true;

    if (feature.displayMode === "every_login") {
      shouldShow = true;
    }

    if (feature.displayMode === "once") {
      shouldShow = !tracking?.viewed;
    }

    if (feature.displayMode === "until_explored") {
      shouldShow = !tracking?.explored;
    }

    if (feature.displayMode === "once_per_version") {
      shouldShow = !tracking?.viewed;
    }

    result.push({
      ...feature,

      tracking: {
        viewed: Boolean(tracking?.viewed),
        explored: Boolean(tracking?.explored),
        viewedAt: tracking?.viewedAt || null,
        exploredAt: tracking?.exploredAt || null,
      },

      shouldShow,
    });
  }

  return result;
};

/* =========================================================
   USER
========================================================= */

export const getWhatsNewForUser = async (req, res) => {
  try {
    const features = await getVisibleFeatures(req);

    const popupFeatures = features.filter((feature) => feature.shouldShow);

    return res.status(200).json({
      success: true,
      count: features.length,
      popupCount: popupFeatures.length,
      features,
      popupFeatures,
    });
  } catch (error) {
    console.error("getWhatsNewForUser error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load What's New features",
    });
  }
};

export const markWhatsNewViewed = async (req, res) => {
  try {
    const { id } = req.params;

    const feature = await WhatsNew.findOne({
      _id: id,
      published: true,
      active: true,
    });

    if (!feature) {
      return res.status(404).json({
        success: false,
        message: "What's New feature not found",
      });
    }

    if (!isTargetedToUser(feature, req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "This feature is not available for your role",
      });
    }

    const now = new Date();

    const view = await WhatsNewView.findOneAndUpdate(
      {
        user: req.user._id,
        whatsNew: feature._id,
        version: feature.version,
      },
      {
        $set: {
          viewed: true,
          viewedAt: now,
        },

        $setOnInsert: {
          user: req.user._id,
          whatsNew: feature._id,
          version: feature.version,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Feature marked as viewed",
      view,
    });
  } catch (error) {
    console.error("markWhatsNewViewed error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to mark feature as viewed",
    });
  }
};

export const markWhatsNewExplored = async (req, res) => {
  try {
    const { id } = req.params;

    const feature = await WhatsNew.findOne({
      _id: id,
      published: true,
      active: true,
    });

    if (!feature) {
      return res.status(404).json({
        success: false,
        message: "What's New feature not found",
      });
    }

    if (!isTargetedToUser(feature, req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "This feature is not available for your role",
      });
    }

    const now = new Date();

    const view = await WhatsNewView.findOneAndUpdate(
      {
        user: req.user._id,
        whatsNew: feature._id,
        version: feature.version,
      },
      {
        $set: {
          viewed: true,
          explored: true,
          viewedAt: now,
          exploredAt: now,
        },

        $setOnInsert: {
          user: req.user._id,
          whatsNew: feature._id,
          version: feature.version,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Feature marked as explored",
      view,
    });
  } catch (error) {
    console.error("markWhatsNewExplored error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to mark feature as explored",
    });
  }
};

/* =========================================================
   ADMIN
========================================================= */

export const getAllWhatsNew = async (req, res) => {
  try {
    const features = await WhatsNew.find()
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .sort({
        order: 1,
        createdAt: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      count: features.length,
      features,
    });
  } catch (error) {
    console.error("getAllWhatsNew error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load What's New features",
    });
  }
};

export const getWhatsNewById = async (req, res) => {
  try {
    const { id } = req.params;

    const feature = await WhatsNew.findById(id).populate("createdBy", "name email role").populate("updatedBy", "name email role");

    if (!feature) {
      return res.status(404).json({
        success: false,
        message: "What's New feature not found",
      });
    }

    return res.status(200).json({
      success: true,
      feature,
    });
  } catch (error) {
    console.error("getWhatsNewById error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load What's New feature",
    });
  }
};

export const createWhatsNew = async (req, res) => {
  try {
    const body = req.body || {};

    const slug = await createUniqueSlug(body.title);

    let targetRoles = body.targetRoles;

    if (!Array.isArray(targetRoles) || targetRoles.length === 0) {
      targetRoles = ["all"];
    }

    if (targetRoles.includes("all")) {
      targetRoles = ["all"];
    }

    const feature = await WhatsNew.create({
      title: body.title.trim(),

      slug,

      shortDescription: typeof body.shortDescription === "string" ? body.shortDescription.trim() : "",

      description: typeof body.description === "string" ? body.description.trim() : "",

      media: body.media || {},

      targetRoles,

      version: body.version.trim(),

      displayMode: body.displayMode || "once_per_version",

      cta: body.cta || {},

      published: typeof body.published === "boolean" ? body.published : false,

      active: typeof body.active === "boolean" ? body.active : true,

      publishAt: body.publishAt ? new Date(body.publishAt) : null,

      order: Number.isInteger(body.order) ? body.order : 0,

      createdBy: req.user._id,

      updatedBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "What's New feature created successfully",
      feature,
    });
  } catch (error) {
    console.error("createWhatsNew error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A feature with this slug already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create What's New feature",
    });
  }
};

export const updateWhatsNew = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const feature = await WhatsNew.findById(id);

    if (!feature) {
      return res.status(404).json({
        success: false,
        message: "What's New feature not found",
      });
    }

    if (body.title !== undefined) {
      feature.title = body.title.trim();
    }

    if (body.shortDescription !== undefined) {
      feature.shortDescription = body.shortDescription.trim();
    }

    if (body.description !== undefined) {
      feature.description = body.description.trim();
    }

    if (body.media !== undefined) {
      feature.media = {
        ...feature.media?.toObject?.(),
        ...body.media,
      };
    }

    if (body.targetRoles !== undefined) {
      if (body.targetRoles.includes("all")) {
        feature.targetRoles = ["all"];
      } else {
        feature.targetRoles = body.targetRoles;
      }
    }

    if (body.version !== undefined) {
      feature.version = body.version.trim();
    }

    if (body.displayMode !== undefined) {
      feature.displayMode = body.displayMode;
    }

    if (body.cta !== undefined) {
      feature.cta = {
        ...feature.cta?.toObject?.(),
        ...body.cta,
      };
    }

    if (body.published !== undefined) {
      feature.published = body.published;
    }

    if (body.active !== undefined) {
      feature.active = body.active;
    }

    if (body.publishAt !== undefined) {
      feature.publishAt = body.publishAt ? new Date(body.publishAt) : null;
    }

    if (body.order !== undefined) {
      feature.order = body.order;
    }

    feature.updatedBy = req.user._id;

    await feature.save();

    return res.status(200).json({
      success: true,
      message: "What's New feature updated successfully",
      feature,
    });
  } catch (error) {
    console.error("updateWhatsNew error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update What's New feature",
    });
  }
};

export const deleteWhatsNew = async (req, res) => {
  try {
    const { id } = req.params;

    const feature = await WhatsNew.findById(id);

    if (!feature) {
      return res.status(404).json({
        success: false,
        message: "What's New feature not found",
      });
    }

    await WhatsNewView.deleteMany({
      whatsNew: feature._id,
    });

    await feature.deleteOne();

    return res.status(200).json({
      success: true,
      message: "What's New feature deleted successfully",
    });
  } catch (error) {
    console.error("deleteWhatsNew error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete What's New feature",
    });
  }
};

export const publishWhatsNew = async (req, res) => {
  try {
    const { id } = req.params;

    const feature = await WhatsNew.findById(id);

    if (!feature) {
      return res.status(404).json({
        success: false,
        message: "What's New feature not found",
      });
    }

    feature.published = true;
    feature.active = true;
    feature.updatedBy = req.user._id;

    if (!feature.publishAt) {
      feature.publishAt = new Date();
    }

    await feature.save();

    return res.status(200).json({
      success: true,
      message: "What's New feature published successfully",
      feature,
    });
  } catch (error) {
    console.error("publishWhatsNew error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to publish What's New feature",
    });
  }
};

export const unpublishWhatsNew = async (req, res) => {
  try {
    const { id } = req.params;

    const feature = await WhatsNew.findById(id);

    if (!feature) {
      return res.status(404).json({
        success: false,
        message: "What's New feature not found",
      });
    }

    feature.published = false;
    feature.updatedBy = req.user._id;

    await feature.save();

    return res.status(200).json({
      success: true,
      message: "What's New feature unpublished successfully",
      feature,
    });
  } catch (error) {
    console.error("unpublishWhatsNew error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to unpublish What's New feature",
    });
  }
};

export const updateWhatsNewOrder = async (req, res) => {
  try {
    const { items } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "items array is required",
      });
    }

    const operations = items.map((item) => ({
      updateOne: {
        filter: {
          _id: item.id,
        },

        update: {
          $set: {
            order: item.order,
            updatedBy: req.user._id,
          },
        },
      },
    }));

    await WhatsNew.bulkWrite(operations);

    return res.status(200).json({
      success: true,
      message: "What's New order updated successfully",
    });
  } catch (error) {
    console.error("updateWhatsNewOrder error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update What's New order",
    });
  }
};

export const getWhatsNewStats = async (req, res) => {
  try {
    const [total, published, active, views, explored] = await Promise.all([
      WhatsNew.countDocuments(),

      WhatsNew.countDocuments({
        published: true,
      }),

      WhatsNew.countDocuments({
        active: true,
      }),

      WhatsNewView.countDocuments({
        viewed: true,
      }),

      WhatsNewView.countDocuments({
        explored: true,
      }),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        total,
        published,
        active,
        views,
        explored,
      },
    });
  } catch (error) {
    console.error("getWhatsNewStats error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load What's New stats",
    });
  }
};
