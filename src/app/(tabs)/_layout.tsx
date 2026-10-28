import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { colors } from '@/theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

function TabIcon({ name, color }: { name: SymbolName; color: ColorValue }) {
  return <SymbolView name={name} tintColor={color} size={24} />;
}

// 하단 탭 4개 (이전 IA 기준, 최신 Figma와 대조 필요)
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSub,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color }) => <TabIcon name={{ ios: 'house', android: 'home' }} color={color} />,
        }}
      />
      <Tabs.Screen
        name="storage"
        options={{
          title: '보관함',
          tabBarIcon: ({ color }) => (
            <TabIcon name={{ ios: 'bookmark', android: 'bookmark' }} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="course"
        options={{
          title: '코스',
          tabBarIcon: ({ color }) => (
            <TabIcon name={{ ios: 'map', android: 'route' }} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="my"
        options={{
          title: '마이',
          tabBarIcon: ({ color }) => (
            <TabIcon name={{ ios: 'person', android: 'person' }} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
