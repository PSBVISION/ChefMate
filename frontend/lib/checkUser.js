import { currentUser } from "@clerk/nextjs/server";

const STRAPI_URL =
  process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

export const checkUser = async () => {
  const user = await currentUser();

  if (!user) {
    console.log("No user found");
    return null;
  }
  if (!STRAPI_API_TOKEN) {
    console.log("No Strapi API Token found");
    return null;
  }

  const subscriptionTier = "free";

  try {
    const existingUserResponse = await fetch(
      `${STRAPI_URL}/api/users?filters[clerkid][$eq]=${user.id}`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        cache: "no-store",
      },
    );
    if (!existingUserResponse.ok) {
      const errorText = await existingUserResponse.text();
      console.log("Strapi error response", errorText);
      return null;
    }

    const existingUserData = await existingUserResponse.json();
    if (existingUserData.length > 0) {
      const existingUser = existingUserData[0];
      if (existingUser.subscriptionTier !== subscriptionTier) {
        await fetch(`${STRAPI_URL}/api/users/${existingUser.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${STRAPI_API_TOKEN}`,
          },
          body: JSON.stringify({ subscriptionTier }),
        });
      }
      return { ...existingUser, subscriptionTier };
    }

    //Get authenticated role
    const roleResponse = await fetch(
      `${STRAPI_URL}/api/users-permissions/roles`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
      },
    );

    const rolesData = await roleResponse.json();
    const authenticatedRole = rolesData.roles.find(
      (role) => role.type === "Authenticated",
    );
    if (!authenticatedRole) {
      console.log("Authenticated role not found");
      return null;
    }
    const userData = {
      username:
        user.username || user.emailAddresses[0].emailAddress.split("@")[0],
      email: user.emailAddresses[0].emailAddress,
      password: `clerk_managed_${user.id}_${Date.now()}`,
      confirmed: true,
      blocked: false,
      role: authenticatedRole.id,
      clerkid: user.id,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      imageUrl: user.imageUrl || "",
      subscriptionTier
    };

    const newUserResponse = await fetch(`${STRAPI_URL}/api/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      },
      body: JSON.stringify(userData),
    });
    if(!newUserResponse.ok){
      const errorText = await newUserResponse.text();
      console.error("Strapi error response", errorText);
      return null;
    }
    const newUser = await newUserResponse.json();
    return newUser;
  } catch (error) {
    console.error("Error in checkUser:", error);
    return null;
  }
};
