import { ArrowLeft, ChevronRight, LogOut, MessageCircle, Plus, SendHorizontal, Users } from 'lucide-react'

const icons = {
  message: MessageCircle,
  back: ArrowLeft,
  send: SendHorizontal,
  plus: Plus,
  chevron: ChevronRight,
  users: Users,
  logout: LogOut,
} as const

interface IconProps {
  name: keyof typeof icons
  size?: number
}

export default function Icon({ name, size = 20 }: IconProps) {
  const Glyph = icons[name]
  return <Glyph size={size} strokeWidth={1.7} aria-hidden="true" />
}
