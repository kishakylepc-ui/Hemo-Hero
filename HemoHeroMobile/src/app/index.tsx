import { useState } from "react";
import { Button, Text, View } from "react-native";

export default function HomeScreen() {
  const [message, setMessage] = useState("Not connected");

  const testBackend = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/health");
      const data = await response.json();

      setMessage(data.message);
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to backend");
    }
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text style={{ marginBottom: 20 }}>
        {message}
      </Text>

      <Button
        title="Test Backend"
        onPress={testBackend}
      />
    </View>
  );
}