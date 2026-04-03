import React, { useRef, useEffect, useState } from "react";
import {
  ScrollView,
  Platform,
  Pressable,
  View,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ViewStyle,
  StyleProp,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/constants/colors";

interface HorizontalScrollProps {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  showArrows?: boolean;
  pagingEnabled?: boolean;
}

export const HorizontalScroll = React.forwardRef<ScrollView, HorizontalScrollProps>(
  ({ children, contentContainerStyle, style, showArrows = true, pagingEnabled }, forwardedRef) => {
    const scrollViewRef = useRef<ScrollView>(null);
    const [scrollOffset, setScrollOffset] = useState(0);
    const [contentWidth, setContentWidth] = useState(0);
    const [containerWidth, setContainerWidth] = useState(0);

    const canScrollLeft = scrollOffset > 0;
    const canScrollRight = contentWidth > scrollOffset + containerWidth + 1;

    useWheelScroll(scrollViewRef);

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (Platform.OS === "web") {
        setScrollOffset(event.nativeEvent.contentOffset.x);
      }
    };

    const scroll = (direction: "left" | "right") => {
      const node = getScrollableNode(scrollViewRef.current);
      if (node) {
        const scrollAmount = 200;
        node.scrollLeft += direction === "left" ? -scrollAmount : scrollAmount;
      }
    };

    React.useImperativeHandle(forwardedRef, () => scrollViewRef.current as ScrollView, []);

    const showButtons = Platform.OS === "web" && showArrows;

    return (
      <View
        style={[styles.container, style]}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        {showButtons && canScrollLeft && (
          <Pressable
            style={[styles.arrowBtn, styles.arrowBtnLeft]}
            onPress={() => scroll("left")}
          >
            <Ionicons name="chevron-back" size={20} color={C.accent} />
          </Pressable>
        )}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={contentContainerStyle}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          pagingEnabled={pagingEnabled}
          onContentSizeChange={(w) => setContentWidth(w)}
        >
          {children}
        </ScrollView>
        {showButtons && canScrollRight && (
          <Pressable
            style={[styles.arrowBtn, styles.arrowBtnRight]}
            onPress={() => scroll("right")}
          >
            <Ionicons name="chevron-forward" size={20} color={C.accent} />
          </Pressable>
        )}
      </View>
    );
  }
);

HorizontalScroll.displayName = "HorizontalScroll";

function getScrollableNode(scrollView: ScrollView | null): HTMLElement | null {
  if (!scrollView) return null;
  const sv = scrollView as unknown as { getScrollableNode?: () => HTMLElement | null };
  return sv.getScrollableNode?.() ?? null;
}

function useWheelScroll(ref: React.RefObject<ScrollView>) {
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const node = getScrollableNode(ref.current);
    if (!node) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > 0) return;
      e.preventDefault();
      node.scrollLeft += e.deltaY;
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, []);
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: "100%",
  },
  arrowBtn: {
    position: "absolute",
    top: "50%" as unknown as number,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    transform: [{ translateY: -18 }],
  },
  arrowBtnLeft: {
    left: 8,
  },
  arrowBtnRight: {
    right: 8,
  },
});
