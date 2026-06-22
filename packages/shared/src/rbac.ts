import type { UserRole } from "./types.js";

export const userRoleHierarchy = [
  "developer",
  "admin",
  "instructor",
  "member",
] satisfies readonly UserRole[];

const userRoleRank: Record<UserRole, number> = {
  developer: 4,
  admin: 3,
  instructor: 2,
  member: 1,
};

export const canAssumeRole = (
  actualRole: UserRole,
  requestedRole: UserRole
): boolean => {
  return userRoleRank[actualRole] >= userRoleRank[requestedRole];
};

export const getAssignableRoles = (actualRole: UserRole): UserRole[] => {
  return userRoleHierarchy.filter((role) => canAssumeRole(actualRole, role));
};

export const getRoleLabel = (role: UserRole): string => {
  switch (role) {
    case "developer":
      return "Developer";
    case "admin":
      return "Admin";
    case "instructor":
      return "Instructor";
    case "member":
      return "Member";
    default:
      role satisfies never;
      return role;
  }
};
