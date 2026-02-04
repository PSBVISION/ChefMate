import { SignInButton, SignUpButton, SignedIn, SignedOut } from "@clerk/nextjs";
import Image from "next/image";
import { Button } from "./ui/button";
import Link from "next/link";
import { Cookie, Refrigerator, Sparkles } from "lucide-react";
import UserDropdown from "./UserDropdown";
import { checkUser } from "@/lib/checkUser";
import PricingModal from "./PricingModal";
import { Badge } from "./ui/badge";

const Header = async () => {
  const user = await checkUser(); // Replace with actual user fetching logic
  return (
    <header className="fixed top-0 w-full border-b border-stone-200 bg-stone-50/80 backdrop-blur-md z-50 supports-backdrop-filter:bg-stone-50/60">
      <nav className="container mx-auto px-4 h-16 flex justify-between items-center">
        <Link
          href={user ? "/dashboard" : "/"}
          className="flex items-center gap-1.5 font-bold text-3xl text-stone-900"
        >
          <Image src="/logo.png" alt="Logo" width={60} height={60} />
          ChefMate
        </Link>
        <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-stone-600">
          <Link
            href="/recipes"
            className="hover:text-orange-600 transition-colors flex gap-1.5 items-center"
          >
            <Cookie className="w-4 h-4" />
            My Recipes
          </Link>
          <Link
            href="/pantry"
            className="hover:text-orange-600 transition-colors flex gap-1.5 items-center"
          >
            <Refrigerator className="w-4 h-4" />
            My Pantry
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          <SignedIn>
            {user && (
              <PricingModal subscriptionTier={user.subscriptionTier}>
                <Badge variant="outline"
                  className={`flex h-8 px-3 gap-1.5 rounded-full text-xs font-semibold transition-all ${
                    user.subscriptionTier === "pro"
                      ? "bg-linear-to-r from-orange-600 to-amber-500 text-white border-none shadow-sm"
                      : "bg-stone-200/50 text-stone-600 border-stone-200 cursor-pointer hover:bg-stone-300/50 hover:border-stone-300"
                  }`}>
                  <Sparkles
                    className={`h-3 w-3 ${user.subscriptionTier === "pro" ? "text-white fill-white/20" : "text-stone-900"}`}
                  />
                  <span>{user.subscriptionTier === "pro" ? "Pro Chef": "Free Plan"}</span>
                </Badge>
              </PricingModal>
            )}
            <UserDropdown />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <Button
                variant="outline"
                className="text-stone-600 border-orange-300 hover:bg-orange-50 hover:border-orange-700"
              >
                {" "}
                Sign In
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button variant="primary">Sign Up</Button>
            </SignUpButton>
          </SignedOut>
        </div>
      </nav>
    </header>
  );
};

export default Header;
