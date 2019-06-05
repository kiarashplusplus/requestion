import React, { Component } from "react";
import {
  ActivityIndicator,
  View,
  Platform,
  FlatList,
  Keyboard,
  StatusBar,
  SafeAreaView
} from "react-native";
import AwesomeDebouncePromise from 'awesome-debounce-promise';
import SearchBar from "react-native-dynamic-search-bar";
import Sticker from "./components/Sticker";

const requestionQuery = query =>
  fetch("https://requestionapp.firebaseapp.com/query?q=" + encodeURIComponent(query))
    .then(response => response.json())
    .then(responseJson => {
      console.log(responseJson);
      return responseJson.stickers;
    })
    .catch(error => {
      console.error(error);
    });

// 1 second pause before fetching new data based on user search query changes.
const queryDebounced = AwesomeDebouncePromise(requestionQuery, 1000);

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      query: '',
      dataSource: [],
      isLoading: false
    };
  }

  setQuery = async text => {
    if (!text) return null;
    this.setState({
      dataSource: [],
      query: text,
      isLoading: true
    });
    const result = await queryDebounced(text);
    this.setState({ dataSource: result, isLoading: false });
    Keyboard.dismiss();
  };  

  renderItem = item => {
    return (
      <Sticker
        imgSrc={item.image}
        imgHeight={item.height}
        imgWidth={item.width}
      />
    );
  };

  endReached() {
    // Placeholder for Analytics
  }

  render() {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#21283d" }}>
      <StatusBar barStyle={"light-content"} />
      <View style={styles.container}>
        <SearchBar
          autoFocus={true}
          ref={search => (this.search = search)}
          fontColor="#c6c6c6"
          iconColor="#c6c6c6"
          shadowColor="#282828"
          cancelIconColor="#c6c6c6"
          backgroundColor="#353d5e"
          placeholder="Search for fact stickers"
          onChangeText={text => {
            this.setQuery(text);
          }}
          onPressCancel={text => {
            this.setState({
              dataSource: [],
              query: text
            });
            this.search.textInput.focus();
          }}
        />
        <View style={{ top: 12 }}>
          {this.state.isLoading && (
            <ActivityIndicator animating={this.state.isLoading} />
          )}
          <FlatList
            data={this.state.dataSource}
            renderItem={({ item }) => this.renderItem(item)}
            keyExtractor={(item, index) => index.toString()}
            onEndReached={this.endReached}
          />
        </View>
      </View>
    </SafeAreaView>
    );
  }
}

const styles = {
  container: {
    ...Platform.select({
      android: {
        top: 24
      }
    }),
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#21283d"
  }
};
