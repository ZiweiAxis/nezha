import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaibaiClient, SendMessageRequest } from '../../src/clients/TaibaiClient';

// Mock fetch globally
global.fetch = vi.fn();

describe('TaibaiClient', () => {
  let client: TaibaiClient;
  const mockFetch = global.fetch as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new TaibaiClient({
      serverAddress: 'http://localhost:8083',
      token: 'test-token',
    });
  });

  describe('constructor', () => {
    it('should normalize URL with http prefix', () => {
      const client1 = new TaibaiClient({ serverAddress: 'localhost:8083' });
      expect((client1 as unknown as { baseUrl: string }).baseUrl).toBe('http://localhost:8083');

      const client2 = new TaibaiClient({ serverAddress: 'https://localhost:8083/' });
      expect((client2 as unknown as { baseUrl: string }).baseUrl).toBe('https://localhost:8083');
    });
  });

  describe('sendTextMessage', () => {
    it('should send text message to room', async () => {
      const mockResponse = {
        event_id: '$test-event-id',
        room_id: '!test-room:example.com',
        sender: '@test-user:example.com',
        timestamp: 1234567890,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      } as unknown as Response);

      const result = await client.sendTextMessage('!test-room:example.com', 'Hello World');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8083/_matrix/client/r0/rooms/!test-room%3Aexample.com/send/m.room.message',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          }),
          body: JSON.stringify({
            msgtype: 'm.text',
            format: 'plain',
            body: 'Hello World',
            content: 'Hello World',
          }),
        })
      );

      expect(result.event_id).toBe('$test-event-id');
      expect(result.room_id).toBe('!test-room:example.com');
    });
  });

  describe('sendHTMLMessage', () => {
    it('should send HTML message to room', async () => {
      const mockResponse = {
        event_id: '$test-event-id',
        room_id: '!test-room:example.com',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      } as unknown as Response);

      const result = await client.sendHTMLMessage(
        '!test-room:example.com',
        'Hello World',
        '<b>Hello World</b>'
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8083/_matrix/client/r0/rooms/!test-room%3Aexample.com/send/m.room.message',
        expect.objectContaining({
          method: 'POST',
        })
      );

      // Verify the body contains expected fields
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(callBody.msgtype).toBe('m.text');
      expect(callBody.format).toBe('html');
      expect(callBody.body).toBe('Hello World');
      
      expect(result.event_id).toBe('$test-event-id');
    });
  });

  describe('sendMessage', () => {
    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: 'Invalid token' }),
        text: () => Promise.resolve('{"error": "Invalid token"}'),
      } as unknown as Response);

      const request: SendMessageRequest = {
        roomId: '!test-room:example.com',
        content: 'Test message',
      };

      await expect(client.sendMessage(request)).rejects.toThrow('Taibai API error: 401 Unauthorized - Invalid token');
    });
  });

  describe('getRoomMessages', () => {
    it('should get room messages with pagination', async () => {
      const mockResponse = {
        chunk: [
          {
            event_id: '$event-1',
            room_id: '!test-room:example.com',
            sender: '@user1:example.com',
            type: 'm.room.message',
            timestamp: 1234567890,
            content: { body: 'Message 1' },
          },
        ],
        start: 's',
        end: 'e',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      } as unknown as Response);

      const result = await client.getRoomMessages('!test-room:example.com', 10, 's');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8083/_matrix/client/r0/rooms/!test-room%3Aexample.com/messages?limit=10&dir=b&from=s',
        expect.any(Object)
      );

      expect(result.chunk).toHaveLength(1);
      expect(result.chunk[0].content.body).toBe('Message 1');
    });
  });

  describe('ping', () => {
    it('should return true when server is reachable', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ versions: [] }),
        text: () => Promise.resolve('{}'),
      } as unknown as Response);

      const result = await client.ping();
      expect(result).toBe(true);
    });

    it('should return false when server is unreachable', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.ping();
      expect(result).toBe(false);
    });
  });

  describe('createRoom', () => {
    it('should create a new room', async () => {
      const mockResponse = { room_id: '!new-room:example.com' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      } as unknown as Response);

      const result = await client.createRoom({
        name: 'Test Room',
        topic: 'A test room',
        isPrivate: false,
      });

      expect(result.room_id).toBe('!new-room:example.com');
    });
  });

  describe('joinRoom', () => {
    it('should join an existing room', async () => {
      const mockResponse = { room_id: '!test-room:example.com' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      } as unknown as Response);

      const result = await client.joinRoom('!test-room:example.com');

      expect(result.room_id).toBe('!test-room:example.com');
    });
  });
});
