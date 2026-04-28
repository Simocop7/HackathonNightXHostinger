const COLORS = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500',
  'bg-orange-500', 'bg-rose-500', 'bg-cyan-500',
  'bg-yellow-500', 'bg-pink-500',
];

interface AvatarUser {
  id: string;
  nome: string;
  cognome: string;
  foto?: string;
}

interface AvatarProps {
  user: AvatarUser;
  className?: string;
  textClassName?: string;
}

export default function Avatar({
  user,
  className = 'w-11 h-11',
  textClassName = 'text-sm font-bold',
}: AvatarProps) {
  if (user.foto) {
    return (
      <img
        src={user.foto}
        alt={`${user.nome[0]}${user.cognome[0]}`}
        className={`${className} rounded-full object-cover shrink-0`}
      />
    );
  }

  const color = COLORS[user.id.charCodeAt(0) % COLORS.length];
  const initials = `${user.nome[0] ?? ''}${user.cognome[0] ?? ''}`.toUpperCase();

  return (
    <div className={`${className} rounded-full flex items-center justify-center text-white shrink-0 ${color} ${textClassName}`}>
      {initials}
    </div>
  );
}
