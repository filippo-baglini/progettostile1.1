import { beautifyUsername } from '../../utils/stringUtils';

interface AvatarProps {
  name: string;
  url?: string | null;
  size?: number;
}

// Profile photo, or the initial on the accent
const Avatar = ({ name, url, size = 36 }: AvatarProps) => (
  <span
    className="inline-flex items-center justify-center rounded-full overflow-hidden bg-accent text-on-accent font-bold shrink-0 ring-1 ring-line"
    style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
  >
    {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : beautifyUsername(name || '?').charAt(0)}
  </span>
);

export default Avatar;
