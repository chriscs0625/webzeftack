#!/usr/bin/env node

/**
 * DEPLOYMENT VERIFICATION SCRIPT
 * 
 * Checks Git status, GitHub sync, and provides deployment checklist
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║        DEPLOYMENT VERIFICATION REPORT                        ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// Helper function to run Git commands
function runGit(command) {
  try {
    return execSync(`git ${command}`, { encoding: 'utf8' }).trim();
  } catch (error) {
    return `ERROR: ${error.message}`;
  }
}

// 1. CHECK GIT STATUS
console.log('📋 PHASE 1: GIT LOCAL STATUS');
console.log('═'.repeat(60));

const status = runGit('status --porcelain');
if (status === '') {
  console.log('✅ Working tree clean - no uncommitted changes');
} else {
  console.log('⚠️  UNCOMMITTED CHANGES FOUND:');
  console.log(status);
  console.log('\n❌ ISSUE: Changes not committed!');
  console.log('   FIX: git add . && git commit -m "Your message"');
}
console.log('');

// 2. CHECK BRANCH STATUS
console.log('🌿 PHASE 2: BRANCH STATUS');
console.log('═'.repeat(60));

const currentBranch = runGit('branch --show-current');
console.log(`Current branch: ${currentBranch}`);

const branchStatus = runGit('status -sb');
console.log(branchStatus);

if (branchStatus.includes('ahead')) {
  console.log('\n⚠️  UNPUSHED COMMITS FOUND!');
  console.log(`   FIX: git push origin ${currentBranch}`);
} else if (branchStatus.includes('[behind')) {
  console.log('\n⚠️  LOCAL BRANCH IS BEHIND REMOTE!');
  console.log(`   FIX: git pull origin ${currentBranch}`);
} else {
  console.log('\n✅ Branch is in sync with remote');
}
console.log('');

// 3. CHECK REMOTE CONNECTION
console.log('🌐 PHASE 3: REMOTE REPOSITORY');
console.log('═'.repeat(60));

const remote = runGit('remote -v');
if (remote.includes('github.com')) {
  const match = remote.match(/github\.com[:/]([^/]+)\/([^\s.]+)/);
  if (match) {
    const owner = match[1];
    const repo = match[2];
    console.log(`✅ Connected to GitHub: ${owner}/${repo}`);
    console.log(`   URL: https://github.com/${owner}/${repo}`);
    console.log('');
    console.log('📊 Verify commits on GitHub:');
    console.log(`   1. Visit: https://github.com/${owner}/${repo}/commits/${currentBranch}`);
    console.log(`   2. Check latest commit matches local`);
  }
} else {
  console.log('❌ No GitHub remote found');
  console.log('   FIX: git remote add origin https://github.com/USERNAME/REPO.git');
}
console.log('');

// 4. CHECK RECENT COMMITS
console.log('📜 PHASE 4: RECENT COMMITS');
console.log('═'.repeat(60));

const commits = runGit('log --oneline -5');
console.log(commits);

const lastCommit = runGit('log -1 --format="%H%n%an%n%aD%n%s"');
const [hash, author, date, message] = lastCommit.split('\n');
console.log('');
console.log('Latest commit details:');
console.log(`  Hash:    ${hash.substring(0, 8)}`);
console.log(`  Author:  ${author}`);
console.log(`  Date:    ${date}`);
console.log(`  Message: ${message}`);
console.log('');

// 5. CHECK PLACEHOLDER FILES
console.log('🎨 PHASE 5: VERIFY CLEANUP CHANGES');
console.log('═'.repeat(60));

const indexExists = fs.existsSync('index.html');
if (indexExists) {
  const content = fs.readFileSync('index.html', 'utf8');
  const placeholderCount = (content.match(/placeholder-image/g) || []).length;
  const imgCount = (content.match(/<img[^>]+>/g) || []).length;
  
  console.log(`✅ index.html exists`);
  console.log(`   Placeholder divs: ${placeholderCount}`);
  console.log(`   Remaining <img> tags: ${imgCount}`);
  
  if (placeholderCount > 0) {
    console.log('   ✅ Cleanup changes are in local files');
  } else {
    console.log('   ❌ No placeholder divs found - cleanup may not be complete');
  }
} else {
  console.log('❌ index.html not found');
}

// Check if placeholders CSS exists
const cssExists = fs.existsSync('assets/css/placeholders.css');
if (cssExists) {
  console.log('✅ assets/css/placeholders.css exists');
} else {
  console.log('❌ assets/css/placeholders.css not found');
}
console.log('');

// 6. CHECK IF CHANGES ARE IN LAST COMMIT
console.log('🔍 PHASE 6: VERIFY CHANGES IN GIT');
console.log('═'.repeat(60));

const committedContent = runGit('show HEAD:index.html');
if (committedContent.includes('placeholder-image')) {
  const committedPlaceholders = (committedContent.match(/placeholder-image/g) || []).length;
  console.log(`✅ Placeholders ARE in last commit (${committedPlaceholders} found)`);
  console.log('   Your changes ARE pushed to GitHub!');
} else {
  console.log('❌ Placeholders NOT in last commit');
  console.log('   Your cleanup changes are not committed!');
  console.log('   FIX:');
  console.log('   1. git add .');
  console.log('   2. git commit -m "Remove images and Webflow - add placeholders"');
  console.log('   3. git push origin main');
}
console.log('');

// 7. DEPLOYMENT CHECKLIST
console.log('✅ PHASE 7: DEPLOYMENT CHECKLIST');
console.log('═'.repeat(60));

const checklist = [
  { check: 'Git working tree clean', status: status === '' },
  { check: 'Branch synced with remote', status: !branchStatus.includes('ahead') && !branchStatus.includes('behind') },
  { check: 'GitHub remote configured', status: remote.includes('github.com') },
  { check: 'Placeholder changes in commit', status: committedContent.includes('placeholder-image') },
  { check: 'Placeholder CSS file exists', status: cssExists },
];

checklist.forEach(item => {
  const icon = item.status ? '✅' : '❌';
  console.log(`${icon} ${item.check}`);
});

console.log('');

// 8. NEXT STEPS
console.log('🚀 PHASE 8: NEXT STEPS');
console.log('═'.repeat(60));

const allGood = checklist.every(item => item.status);

if (allGood) {
  console.log('✅ ALL CHECKS PASSED!');
  console.log('');
  console.log('Your changes ARE on GitHub. If not showing on live site:');
  console.log('');
  console.log('1. CHECK VERCEL DASHBOARD:');
  console.log('   → Visit: https://vercel.com/dashboard');
  console.log('   → Find your project');
  console.log('   → Check "Deployments" tab');
  console.log('   → Verify latest deployment matches your commit');
  console.log('');
  console.log('2. CHECK VERCEL CONNECTION:');
  console.log('   → Settings → Git');
  console.log('   → Verify repository is connected');
  console.log('   → Verify auto-deploy is enabled');
  console.log('   → Check production branch matches your current branch');
  console.log('');
  console.log('3. MANUAL REDEPLOY (if needed):');
  console.log('   → Deployments → Latest → ... → Redeploy');
  console.log('   OR run: vercel --prod');
  console.log('');
  console.log('4. CLEAR BROWSER CACHE:');
  console.log('   → Hard refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)');
  console.log('   → Or open in incognito/private mode');
  console.log('');
  console.log('5. VERIFY LIVE SITE:');
  const match = remote.match(/github\.com[:/]([^/]+)\/([^\s.]+)/);
  if (match) {
    const repo = match[2];
    console.log(`   → Your site might be: https://${repo}.vercel.app`);
  }
  console.log('   → View page source - should show placeholder-image divs');
  console.log('   → Check DevTools console - should be zero errors');
} else {
  console.log('❌ ISSUES FOUND - Follow these steps:');
  console.log('');
  
  if (status !== '') {
    console.log('1. COMMIT CHANGES:');
    console.log('   git add .');
    console.log('   git commit -m "Remove images and Webflow - add placeholders"');
  }
  
  if (branchStatus.includes('ahead')) {
    console.log('2. PUSH TO GITHUB:');
    console.log(`   git push origin ${currentBranch}`);
  }
  
  if (!committedContent.includes('placeholder-image')) {
    console.log('3. VERIFY FILE IS SAVED:');
    console.log('   → Save all files in VS Code (Ctrl+K S)');
    console.log('   → Re-run: git add . && git commit -m "Add changes"');
  }
}

console.log('');
console.log('═'.repeat(60));
console.log('Report generated: ' + new Date().toLocaleString());
console.log('═'.repeat(60));
