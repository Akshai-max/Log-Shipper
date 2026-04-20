import React from 'react';
import { Play, Search, Bot, Globe, FileText, Github, Terminal, MessageSquare, Mail, ShieldCheck } from 'lucide-react';

export function getDomainMeta(domain) {
  if (!domain) return { label: 'Unknown', icon: Globe };
  const lower = domain.toLowerCase();
  
  if (lower.includes('youtube.com')) return { label: 'YouTube', icon: Play };
  if (lower.includes('google.com')) return { label: 'Google Search', icon: Search };
  if (lower.includes('chatgpt.com') || lower.includes('openai.com')) return { label: 'AI Assistant', icon: Bot };
  if (lower.includes('github.com')) return { label: 'GitHub', icon: Github };
  if (lower.includes('stackoverflow.com')) return { label: 'Stack Overflow', icon: Terminal };
  if (lower.includes('docs.')) return { label: 'Documentation', icon: FileText };
  if (lower.includes('mail.google') || lower.includes('outlook')) return { label: 'Email', icon: Mail };
  if (lower.includes('slack.com') || lower.includes('discord.com')) return { label: 'Chat / Comms', icon: MessageSquare };
  if (lower.length > 30 && !lower.includes('.')) return { label: 'Restricted Access', icon: ShieldCheck };

  return { label: domain, icon: Globe };
}
