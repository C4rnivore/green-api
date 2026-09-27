import { useState } from 'react'
import { errorText } from '../api/apiUtils.ts'
import { useIncomingNotifications } from '../hooks/useIncomingNotifications.ts'
import { useMessengerStore } from '../store/messengerStore.ts'
import { ChatSidebar } from './ChatSidebar.tsx'
import { ChatWindow } from './ChatWindow.tsx'
import { NewChatDialog } from './NewChatDialog.tsx'
import { SettingsDialog } from './SettingsDialog.tsx'

export function MessangerLayout() {
  const [newChatOpen, setNewChatOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const activeChatId = useMessengerStore((state) => state.activeChatId)
  const notifications = useIncomingNotifications()
  const pollError = notifications.error ? errorText(notifications.error) : null

  return (
    <div className="app-shell">
      {pollError ? (
        <div className="poll-error" role="status">
          {pollError}
        </div>
      ) : null}
      <div className={activeChatId ? 'layout chat-open' : 'layout'}>
        <ChatSidebar onNewChat={() => setNewChatOpen(true)} onSettings={() => setSettingsOpen(true)} />
        <ChatWindow />
        {newChatOpen ? <NewChatDialog onClose={() => setNewChatOpen(false)} /> : null}
        {settingsOpen ? <SettingsDialog onClose={() => setSettingsOpen(false)} /> : null}
      </div>
    </div>
  )
}
