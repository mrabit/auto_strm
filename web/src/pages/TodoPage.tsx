import { useState, useEffect, useCallback } from 'react';
import { Input, Button, List, Checkbox, Typography, Space, message, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { fetchTodos, createTodo, updateTodo, deleteTodo } from '../api';
import type { Todo } from '../types';

const { Text } = Typography;

export default function TodoPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const loadTodos = useCallback(async () => {
    try {
      const data = await fetchTodos();
      setTodos(data);
    } catch {
      message.error('加载待办事项失败');
    }
  }, []);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setLoading(true);
    try {
      await createTodo(newTitle.trim());
      setNewTitle('');
      await loadTodos();
    } catch {
      message.error('创建待办事项失败');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (todo: Todo) => {
    try {
      await updateTodo(todo.id, { done: !todo.done });
      await loadTodos();
    } catch {
      message.error('更新待办事项失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTodo(id);
      await loadTodos();
    } catch {
      message.error('删除待办事项失败');
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 16 }}>待办事项示例</h2>

      <Space.Compact style={{ width: '100%', marginBottom: 24 }}>
        <Input
          placeholder="添加新的待办事项..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onPressEnter={handleAdd}
          size="large"
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          loading={loading}
          size="large"
        >
          添加
        </Button>
      </Space.Compact>

      <List
        dataSource={todos}
        locale={{ emptyText: '暂无待办事项' }}
        renderItem={(todo) => (
          <List.Item
            actions={[
              <Popconfirm
                key="delete"
                title="确认删除此待办事项？"
                onConfirm={() => handleDelete(todo.id)}
              >
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>,
            ]}
          >
            <Checkbox checked={todo.done} onChange={() => handleToggle(todo)}>
              <Text delete={todo.done} type={todo.done ? 'secondary' : undefined}>
                {todo.title}
              </Text>
            </Checkbox>
          </List.Item>
        )}
      />
    </div>
  );
}
