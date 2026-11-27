const Role = require('../models/Role');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { PERMISSION_GROUPS, ALL_PERMISSION_KEYS, sanitizePermissions } = require('../config/permissions');

const toSlug = (name) =>
  String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const DEFAULT_PAGE_ACCESS = {
  chats: true,
  stories: true,
  calls: true,
  communities: true,
  settings: true
};

const sanitizePageAccess = (raw) => {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    chats: src.chats !== false,
    stories: src.stories !== false,
    calls: src.calls !== false,
    communities: src.communities !== false,
    settings: src.settings !== false
  };
};

const sanitizeRestrictedMessages = (raw) => {
  const src = raw && typeof raw === 'object' ? raw : {};
  const clean = (v) => (typeof v === 'string' ? v.trim().slice(0, 300) : '');
  return {
    default: clean(src.default),
    chats: clean(src.chats),
    stories: clean(src.stories),
    calls: clean(src.calls),
    communities: clean(src.communities),
    settings: clean(src.settings)
  };
};

// @desc Get centralized permission catalog
// @route GET /api/admin/permissions
const getPermissionCatalog = async (req, res) => {
  return res.json({
    success: true,
    groups: PERMISSION_GROUPS,
    allPermissions: ALL_PERMISSION_KEYS
  });
};

// @desc List all custom roles with assigned user counts
// @route GET /api/admin/roles
const getRoles = async (req, res) => {
  try {
    const [roles, counts] = await Promise.all([
      Role.find()
        .populate('createdBy', 'username nickname avatar')
        .populate('updatedBy', 'username nickname avatar')
        .sort({ createdAt: -1 })
        .lean(),
      User.aggregate([
        { $match: { customRole: { $ne: null } } },
        { $group: { _id: '$customRole', count: { $sum: 1 } } }
      ])
    ]);

    const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
    const enriched = roles.map((r) => ({
      ...r,
      assignedUserCount: countMap.get(String(r._id)) || 0
    }));

    return res.json({ success: true, roles: enriched });
  } catch (error) {
    console.error('[Get Roles Error]', error);
    return res.status(500).json({ success: false, message: 'Error fetching custom roles.' });
  }
};

// @desc Get single role details + assigned users
// @route GET /api/admin/roles/:id
const getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id)
      .populate('createdBy', 'username nickname avatar')
      .populate('updatedBy', 'username nickname avatar')
      .lean();

    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found.' });
    }

    const assignedUsers = await User.find({ customRole: role._id })
      .select('username nickname email avatar role isBanned isDeactivated createdAt')
      .sort({ username: 1 })
      .lean();

    return res.json({
      success: true,
      role: {
        ...role,
        assignedUserCount: assignedUsers.length
      },
      assignedUsers
    });
  } catch (error) {
    console.error('[Get Role Detail Error]', error);
    return res.status(500).json({ success: false, message: 'Error fetching role details.' });
  }
};

// @desc Create a new custom role
// @route POST /api/admin/roles
const createRole = async (req, res) => {
  try {
    const { name, description = '', permissions = [], pageAccess, restrictedMessages } = req.body;
    const cleanName = typeof name === 'string' ? name.trim() : '';

    if (!cleanName || cleanName.length < 2) {
      return res.status(400).json({ success: false, message: 'Role name must be at least 2 characters.' });
    }

    if (['super admin', 'superadmin', 'admin', 'user', 'normal user'].includes(cleanName.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'That name is reserved for a system role. Please choose a custom role name.'
      });
    }

    const slug = toSlug(cleanName);
    if (!slug) {
      return res.status(400).json({ success: false, message: 'Role name must contain valid characters.' });
    }

    const existing = await Role.findOne({ $or: [{ slug }, { name: new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }] });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A role with this name already exists.' });
    }

    const cleanPermissions = sanitizePermissions(permissions);
    const cleanPageAccess = sanitizePageAccess(pageAccess);
    const cleanRestrictedMessages = sanitizeRestrictedMessages(restrictedMessages);
    const hasPageRestriction = Object.values(cleanPageAccess).some((v) => v === false);

    if (cleanPermissions.length === 0 && !hasPageRestriction) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one permission or configure app page access restrictions.'
      });
    }

    const role = await Role.create({
      name: cleanName,
      slug,
      description: String(description || '').trim(),
      permissions: cleanPermissions,
      pageAccess: cleanPageAccess,
      restrictedMessages: cleanRestrictedMessages,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    await AuditLog.create({
      admin: req.user._id,
      action: 'ROLE_CREATED',
      targetType: 'Role',
      targetId: role._id,
      details: {
        roleName: role.name,
        permissionCount: cleanPermissions.length,
        permissions: cleanPermissions,
        actorRole: 'Super Admin'
      },
      ipAddress: req.ip
    });

    const populated = await Role.findById(role._id)
      .populate('createdBy', 'username nickname avatar')
      .populate('updatedBy', 'username nickname avatar')
      .lean();

    return res.status(201).json({
      success: true,
      message: `Role "${role.name}" created.`,
      role: { ...populated, assignedUserCount: 0 }
    });
  } catch (error) {
    console.error('[Create Role Error]', error);
    return res.status(500).json({ success: false, message: 'Error creating custom role.' });
  }
};

// @desc Update an existing custom role
// @route PUT /api/admin/roles/:id
const updateRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found.' });
    }

    const { name, description, permissions, pageAccess, restrictedMessages } = req.body;
    const prevPermissions = [...(role.permissions || [])];
    const prevName = role.name;

    if (typeof name === 'string') {
      const cleanName = name.trim();
      if (cleanName.length < 2) {
        return res.status(400).json({ success: false, message: 'Role name must be at least 2 characters.' });
      }
      if (['super admin', 'superadmin', 'admin', 'user', 'normal user'].includes(cleanName.toLowerCase())) {
        return res.status(400).json({ success: false, message: 'That name is reserved for a system role.' });
      }
      const slug = toSlug(cleanName);
      const conflict = await Role.findOne({ _id: { $ne: role._id }, $or: [{ slug }, { name: new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }] });
      if (conflict) {
        return res.status(409).json({ success: false, message: 'Another role with this name already exists.' });
      }
      role.name = cleanName;
      role.slug = slug;
    }

    if (description !== undefined) {
      role.description = String(description || '').trim();
    }

    if (pageAccess !== undefined) {
      role.pageAccess = sanitizePageAccess(pageAccess);
    }

    if (restrictedMessages !== undefined) {
      role.restrictedMessages = sanitizeRestrictedMessages(restrictedMessages);
    }

    if (permissions !== undefined) {
      const cleanPermissions = sanitizePermissions(permissions);
      const nextPageAccess = role.pageAccess || DEFAULT_PAGE_ACCESS;
      const hasPageRestriction = Object.values(nextPageAccess).some((v) => v === false);
      if (cleanPermissions.length === 0 && !hasPageRestriction) {
        return res.status(400).json({
          success: false,
          message: 'Please select at least one permission or configure app page access restrictions.'
        });
      }
      role.permissions = cleanPermissions;
    }

    role.updatedBy = req.user._id;
    await role.save();

    await AuditLog.create({
      admin: req.user._id,
      action: 'ROLE_UPDATED',
      targetType: 'Role',
      targetId: role._id,
      details: {
        previousName: prevName,
        roleName: role.name,
        previousPermissionCount: prevPermissions.length,
        newPermissionCount: role.permissions.length,
        permissions: role.permissions,
        actorRole: 'Super Admin'
      },
      ipAddress: req.ip
    });

    // Notify connected users assigned to this role
    const io = req.app.get('io');
    if (io) {
      const assignedUsers = await User.find({ customRole: role._id }).select('_id').lean();
      assignedUsers.forEach((u) => {
        io.to(`user:${u._id}`).emit('user:rbac_updated', { roleId: role._id });
      });
    }

    const assignedUserCount = await User.countDocuments({ customRole: role._id });
    const populated = await Role.findById(role._id)
      .populate('createdBy', 'username nickname avatar')
      .populate('updatedBy', 'username nickname avatar')
      .lean();

    return res.json({
      success: true,
      message: `Role "${role.name}" updated.`,
      role: { ...populated, assignedUserCount }
    });
  } catch (error) {
    console.error('[Update Role Error]', error);
    return res.status(500).json({ success: false, message: 'Error updating custom role.' });
  }
};

// @desc Duplicate an existing custom role
// @route POST /api/admin/roles/:id/duplicate
const duplicateRole = async (req, res) => {
  try {
    const source = await Role.findById(req.params.id).lean();
    if (!source) {
      return res.status(404).json({ success: false, message: 'Source role not found.' });
    }

    let copyName = `${source.name} (Copy)`;
    let copySlug = toSlug(copyName);
    let suffix = 2;
    while (await Role.exists({ slug: copySlug })) {
      copyName = `${source.name} (Copy ${suffix})`;
      copySlug = toSlug(copyName);
      suffix += 1;
    }

    const cloned = await Role.create({
      name: copyName,
      slug: copySlug,
      description: source.description || '',
      permissions: sanitizePermissions(source.permissions),
      pageAccess: sanitizePageAccess(source.pageAccess),
      restrictedMessages: sanitizeRestrictedMessages(source.restrictedMessages),
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    await AuditLog.create({
      admin: req.user._id,
      action: 'ROLE_DUPLICATED',
      targetType: 'Role',
      targetId: cloned._id,
      details: {
        sourceRoleId: source._id,
        sourceRoleName: source.name,
        newRoleName: cloned.name,
        permissionCount: cloned.permissions.length,
        actorRole: 'Super Admin'
      },
      ipAddress: req.ip
    });

    const populated = await Role.findById(cloned._id)
      .populate('createdBy', 'username nickname avatar')
      .populate('updatedBy', 'username nickname avatar')
      .lean();

    return res.status(201).json({
      success: true,
      message: `Duplicated as "${cloned.name}".`,
      role: { ...populated, assignedUserCount: 0 }
    });
  } catch (error) {
    console.error('[Duplicate Role Error]', error);
    return res.status(500).json({ success: false, message: 'Error duplicating role.' });
  }
};

// @desc Delete a custom role safely (reassigns or revokes users)
// @route DELETE /api/admin/roles/:id
const deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found.' });
    }

    const { reassignRoleId = null } = req.body || {};
    let nextRole = null;

    if (reassignRoleId) {
      if (String(reassignRoleId) === String(role._id)) {
        return res.status(400).json({ success: false, message: 'Cannot reassign to the role being deleted.' });
      }
      nextRole = await Role.findById(reassignRoleId);
      if (!nextRole) {
        return res.status(404).json({ success: false, message: 'Target reassignment role not found.' });
      }
    }

    const affectedUsers = await User.find({ customRole: role._id }).select('_id').lean();
    await User.updateMany(
      { customRole: role._id },
      { $set: { customRole: nextRole ? nextRole._id : null } }
    );

    await role.deleteOne();

    await AuditLog.create({
      admin: req.user._id,
      action: 'ROLE_DELETED',
      targetType: 'Role',
      targetId: role._id,
      details: {
        roleName: role.name,
        affectedUserCount: affectedUsers.length,
        reassignedTo: nextRole ? nextRole.name : 'Normal User (Revoked)',
        actorRole: 'Super Admin'
      },
      ipAddress: req.ip
    });

    const io = req.app.get('io');
    if (io) {
      affectedUsers.forEach((u) => {
        io.to(`user:${u._id}`).emit('user:rbac_updated', { roleId: nextRole ? nextRole._id : null });
      });
    }

    return res.json({
      success: true,
      message: nextRole
        ? `Role "${role.name}" deleted and ${affectedUsers.length} user(s) reassigned to "${nextRole.name}".`
        : `Role "${role.name}" deleted and ${affectedUsers.length} user(s) restored to Normal User.`
    });
  } catch (error) {
    console.error('[Delete Role Error]', error);
    return res.status(500).json({ success: false, message: 'Error deleting role.' });
  }
};

// @desc Assign, change, or remove a custom role on an existing user
// @route PUT /api/admin/users/:id/custom-role
const assignCustomRoleToUser = async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id).populate('customRole', 'name');
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (targetUser.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Super Admin accounts are protected and cannot be modified via custom role assignment.'
      });
    }

    const { roleId } = req.body;
    const prevRoleName = targetUser.customRole?.name || 'Normal User';

    if (!roleId) {
      targetUser.customRole = null;
      await targetUser.save();

      await AuditLog.create({
        admin: req.user._id,
        action: 'ROLE_UNASSIGNED',
        targetType: 'User',
        targetId: targetUser._id,
        details: {
          username: targetUser.username,
          previousRole: prevRoleName,
          newRole: 'Normal User',
          actorRole: 'Super Admin'
        },
        ipAddress: req.ip
      });

      const io = req.app.get('io');
      if (io) io.to(`user:${targetUser._id}`).emit('user:rbac_updated', { roleId: null });

      return res.json({
        success: true,
        message: `Removed custom role from @${targetUser.username}. Restored Normal User access.`,
        user: { ...targetUser.toJSON(), customRole: null }
      });
    }

    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Selected custom role not found.' });
    }

    targetUser.customRole = role._id;
    await targetUser.save();

    await AuditLog.create({
      admin: req.user._id,
      action: 'ROLE_ASSIGNED',
      targetType: 'User',
      targetId: targetUser._id,
      details: {
        username: targetUser.username,
        previousRole: prevRoleName,
        newRole: role.name,
        permissionCount: role.permissions.length,
        actorRole: 'Super Admin'
      },
      ipAddress: req.ip
    });

    const io = req.app.get('io');
    if (io) io.to(`user:${targetUser._id}`).emit('user:rbac_updated', { roleId: role._id });

    return res.json({
      success: true,
      message: `Assigned "${role.name}" to @${targetUser.username}.`,
      user: {
        ...targetUser.toJSON(),
        customRole: {
          _id: role._id,
          name: role.name,
          slug: role.slug,
          description: role.description,
          permissions: role.permissions
        }
      }
    });
  } catch (error) {
    console.error('[Assign Custom Role Error]', error);
    return res.status(500).json({ success: false, message: 'Error assigning custom role.' });
  }
};

module.exports = {
  getPermissionCatalog,
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  duplicateRole,
  deleteRole,
  assignCustomRoleToUser
};
