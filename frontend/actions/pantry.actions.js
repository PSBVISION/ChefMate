"use server";

import { freePantryScans, proTierLimit } from "@/lib/arcjet";
import { checkUser } from "@/lib/checkUser";
import { GoogleGenerativeAI } from "@google/generative-ai";


const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);


export async function scanPantryImage(image) {
  try {
    const user = await checkUser();
    if(!user){
      throw new Error("User is not authorized");
    }
    const isPro = user.subscriptionTier === "pro";
    // Apply rate limiting based on subscription tier
    const arcjetClient = isPro ? proTierLimit : freePantryScans;
    const req = await request(); 
    const decision = await arcjetClient.protect(req,{
      userId: user.clerkId,
      requested: 1
    })
  } catch (error) {
    
  }
}