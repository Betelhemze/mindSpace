import React from 'react';
import {
  BookOpen,
  Sun,
  Heart,
  Star,
  Activity,
  Briefcase,
  PenTool,
  Shuffle,
  Tag,
} from 'lucide-react';

interface Props {
  iconName: string;
  size?: number;
  className?: string;
  color?: string;
}

export const CategoryIcon: React.FC<Props> = ({ iconName, size = 14, color }) => {
  const props = { size, color };

  switch (iconName) {
    case 'BookOpen':
      return <BookOpen {...props} />;
    case 'Sun':
      return <Sun {...props} />;
    case 'Heart':
      return <Heart {...props} />;
    case 'Star':
      return <Star {...props} />;
    case 'Activity':
      return <Activity {...props} />;
    case 'Briefcase':
      return <Briefcase {...props} />;
    case 'PenTool':
      return <PenTool {...props} />;
    case 'Shuffle':
      return <Shuffle {...props} />;
    default:
      return <Tag {...props} />;
  }
};

