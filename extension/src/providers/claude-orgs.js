// Orders the account's organizations for lookup. The lastActiveOrg cookie is only
// a hint: after an account switch it can name an organization the current
// account does not have, so it is used only if the account's own list contains it.

export function orderOrganizations(organizations, cookieOrg) {
  const ids = organizations.map((o) => o.uuid);
  return ids.includes(cookieOrg) ? [cookieOrg, ...ids.filter((id) => id !== cookieOrg)] : ids;
}
