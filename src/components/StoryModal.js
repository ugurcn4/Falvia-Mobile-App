import React, { useEffect } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Dimensions,
  StatusBar,
  Platform
} from 'react-native';
import StoryViewer from './StoryViewer';
import colors from '../styles/colors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const StoryModal = ({ 
  visible, 
  stories, 
  initialIndex = 0, 
  onClose, 
  onStoryComplete,
  onNavigation,
  fortuneTellerName,
  fortuneTellerAvatar,
  currentStoryIndex,
  totalStories
}) => {
  useEffect(() => {
    if (visible) {
      // Modal açıldığında status bar'ı gizle
      StatusBar.setHidden(true);
    } else {
      // Modal kapandığında status bar'ı göster
      StatusBar.setHidden(false);
    }

    return () => {
      // Component unmount olduğunda status bar'ı geri göster
      StatusBar.setHidden(false);
    };
  }, [visible]);

  const handleClose = () => {
    onClose();
  };

  const handleStoryComplete = (storyId, completed) => {
    if (onStoryComplete) {
      onStoryComplete(storyId, completed);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <StoryViewer
          stories={stories}
          initialIndex={initialIndex}
          onClose={handleClose}
          onStoryComplete={handleStoryComplete}
          onNavigation={onNavigation}
          fortuneTellerName={fortuneTellerName}
          fortuneTellerAvatar={fortuneTellerAvatar}
          currentStoryIndex={currentStoryIndex}
          totalStories={totalStories}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default StoryModal; 