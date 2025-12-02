# EAS Build Credentials Setup

## Problem
Your CI/CD builds are failing because Android keystore credentials haven't been generated yet.

## Solution: Run Locally FIRST

### Step 1: Generate Credentials Locally
Run this command **on your local machine** (not in GitHub Actions):

```bash
cd "/home/madhan/Desktop/New Folder/mraker"
eas build --profile production --platform android
```

### Step 2: When Prompted
- ✅ Select **"Yes"** to generate a new Android Keystore
- ✅ EAS will automatically upload it to their servers
- ✅ Wait for the build to complete (or you can cancel after credentials are uploaded)

### Step 3: Verify Credentials Were Created
```bash
eas credentials
```
- Select **Android**
- Select **production**
- You should see the keystore listed

### Step 4: Now CI/CD Will Work
After credentials are on EAS servers, your GitHub Actions builds will work automatically!

## Alternative: Use EAS Credentials Command

If you just want to generate credentials without building:

```bash
eas credentials
```
Then:
1. Select **Android**
2. Select **production** 
3. Select **Set up a new keystore**
4. Follow the prompts

## Why This Happens
- EAS stores Android signing credentials (keystore) on their servers
- First-time setup requires interactive confirmation
- CI/CD runs in non-interactive mode, so it can't generate credentials
- Once credentials exist on EAS, all future builds (including CI/CD) work automatically

## What Happens Next
Once you run the local build:
- ✅ Keystore is generated and encrypted
- ✅ Stored securely on EAS servers  
- ✅ Used automatically for all future builds
- ✅ CI/CD builds will succeed

---

**Important**: This is a **one-time setup**. After credentials exist, you can build from anywhere!


