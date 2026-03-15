import { LucideIcon } from 'lucide-react';
import { 
  Calendar, 
  BookOpen, 
  GraduationCap, 
  Calculator, 
  FlaskConical, 
  Code, 
  PenTool, 
  Music, 
  Globe, 
  Microscope,
  Palette,
  Languages,
  FileText,
  Brain,
  Briefcase
} from 'lucide-react';

export const COURSE_ICONS: { name: string; icon: LucideIcon; category: string }[] = [
  { name: 'Calendar', icon: Calendar, category: 'General' },
  { name: 'Book', icon: BookOpen, category: 'General' },
  { name: 'Graduation', icon: GraduationCap, category: 'General' },
  { name: 'Math', icon: Calculator, category: 'STEM' },
  { name: 'Science', icon: FlaskConical, category: 'STEM' },
  { name: 'Code', icon: Code, category: 'STEM' },
  { name: 'Microscope', icon: Microscope, category: 'STEM' },
  { name: 'Writing', icon: PenTool, category: 'Arts' },
  { name: 'Music', icon: Music, category: 'Arts' },
  { name: 'Art', icon: Palette, category: 'Arts' },
  { name: 'Language', icon: Languages, category: 'Arts' },
  { name: 'Document', icon: FileText, category: 'General' },
  { name: 'Brain', icon: Brain, category: 'General' },
  { name: 'Globe', icon: Globe, category: 'General' },
  { name: 'Business', icon: Briefcase, category: 'General' },
];
