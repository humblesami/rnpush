import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import colors from '../config/colors';

function AppButton({ title, onPress, color ="primary" }) {
    return (
      <TouchableOpacity style={[styles.button, { backgroundColor: colors[color] }]} onPress={onPress} >
          <Text style={styles.text}>{title}</Text>
      </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        backgroundColor: colors.primary,
        borderRadius: 20, // makes your button circled
        justifyContent: 'center', // puts your content in the center
        alignItems: 'center',
        padding: 10,
        width: '100%',
        marginVertical: 10,
    },
    text: {
        color: colors.white,
        fontSize: 16,
        textTransform: 'uppercase',
        fontWeight: 'bold'
    }
})

export default AppButton;