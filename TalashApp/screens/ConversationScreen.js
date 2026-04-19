import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const PRIMARY = '#2C097F';

function formatTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ConversationScreen({ navigation, route }) {
  const { conversationId, listing } = route.params;
  const { token, user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => { fetchMessages(); }, [conversationId]);

  const fetchMessages = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMessages(data.messages || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const send = async () => {
    if (!text.trim() || sending) return;
    const body = text.trim();
    setText('');
    setSending(true);

    const tempMsg = {
      id: `temp_${Date.now()}`,
      sender_id: user?.id,
      body,
      created_at: new Date().toISOString(),
      is_read: false,
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const res = await fetch(`${API_URL}/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(prev =>
          prev.map(m => (m.id === tempMsg.id ? data.message : m))
        );
      }
    } catch { /* keep temp message */ }
    finally { setSending(false); }
  };

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const renderMessage = ({ item, index }) => {
    const isMe = item.sender_id === user?.id;
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const showTime =
      !prevMsg ||
      new Date(item.created_at) - new Date(prevMsg.created_at) > 5 * 60 * 1000;

    return (
      <View>
        {showTime && (
          <Text style={styles.timeDivider}>{formatTime(item.created_at)}</Text>
        )}
        <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
            <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
              {item.body}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#0d121b" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.listingCard}
          onPress={() => listing && navigation.navigate('PetDetail', { listingId: listing.id })}
        >
          {listing?.photos?.[0] ? (
            <Image source={{ uri: listing.photos[0] }} style={styles.listingThumb} />
          ) : (
            <View style={[styles.listingThumb, { backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }]}>
              <MaterialIcons name="pets" size={16} color="#94a3b8" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.listingTitle} numberOfLines={1}>{listing?.title || 'Pet Listing'}</Text>
            <Text style={styles.listingPrice}>
              {listing?.is_free ? 'Free' : listing?.price ? `PKR ${Number(listing.price).toLocaleString('en-PK')}` : ''}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        {loading ? (
          <LoadingSpinner />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messages}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#94a3b8"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={send}
            disabled={!text.trim() || sending}
          >
            <MaterialIcons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f6f8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  listingCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f6f6f8',
    borderRadius: 10,
    padding: 8,
  },
  listingThumb: { width: 36, height: 36, borderRadius: 8 },
  listingTitle: { fontSize: 13, fontWeight: '700', color: '#0d121b' },
  listingPrice: { fontSize: 12, color: PRIMARY, fontWeight: '600' },
  messages: { padding: 16, paddingBottom: 8 },
  timeDivider: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94a3b8',
    marginVertical: 10,
    fontWeight: '600',
  },
  msgRow: { flexDirection: 'row', marginBottom: 4 },
  msgRowMe: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMe: {
    backgroundColor: PRIMARY,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  bubbleText: { fontSize: 15, color: '#0d121b', lineHeight: 20 },
  bubbleTextMe: { color: '#fff' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: '#f6f6f8',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0d121b',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#cbd5e1' },
});
