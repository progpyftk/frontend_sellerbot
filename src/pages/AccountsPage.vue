<template>
  <div>
    <!-- Loading Indicator -->
    <div v-if="loadingtable">
      <q-page class="flex flex-center">
        <q-card class="q-pa-md">
          <q-spinner size="50px" color="primary"></q-spinner>
        </q-card>
      </q-page>
    </div>

    <!-- Data Table -->
    <q-card v-else class="q-pa-md" outlined>
      <q-table
        :rows="accounts"
        :columns="headers"
        row-key="ml_seller_id"
        flat
      >
        <template v-slot:top="props">
          <q-toolbar>
            <q-toolbar-title>MercadoLivre - Contas on Seller Bot</q-toolbar-title>
            <q-separator class="q-mx-md" vertical></q-separator>
            <q-space></q-space>
            <q-btn color="primary" icon="add" label="Add Account" @click="openDialog"></q-btn>
          </q-toolbar>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td>
            <q-btn flat round icon="edit" @click="editItem(props.row)" />
            <q-btn flat round icon="delete" color="negative" @click="confirmDelete(props.row)" />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Dialog for Adding/Editing Accounts -->
    <q-dialog v-model="dialog">
      <q-card>
        <q-card-section>
          <div class="text-h6">{{ formTitle }}</div>
        </q-card-section>

        <q-card-section>
          <q-input v-model="editedItem.nickname" label="Account Name" />
          <q-input v-if="editedIndex === -1" v-model="editedItem.ml_seller_id" label="Seller ID" />
          <q-input v-else v-model="editedItem.ml_seller_id" label="Seller ID - Not editable" readonly />
          <q-input v-model="editedItem.code" label="Code" />
          <q-input v-if="editedIndex > -1" v-model="editedItem.access_token" label="Access Token" />
          <q-input v-if="editedIndex > -1" v-model="editedItem.refresh_token" label="Refresh Token" />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" @click="close" />
          <q-btn flat label="Save" color="primary" @click="save" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog for Confirming Deletion -->
    <q-dialog v-model="dialogDelete">
      <q-card>
        <q-card-section class="text-h6">
          Are you sure you want to delete this item?
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" @click="closeDelete" />
          <q-btn flat label="OK" color="primary" @click="deleteSeller" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStore } from '../stores/store';
import axios from 'axios';

// Pinia Store
const store = useStore();

// State Variables
const dialog = ref(false);
const dialogDelete = ref(false);
const loadingtable = ref(false);
const editedIndex = ref(-1);
const accounts = ref([]);
const editedItem = ref({
  ml_seller_id: '',
  sellerid: '',
  access_token: '',
  refresh_token: ''
});
const defaultItem = {
  ml_seller_id: '',
  sellerid: '',
  access_token: '',
  refresh_token: ''
};

// Headers for the Table
const headers = [
  { name: 'ml_seller_id', label: 'Seller ID', align: 'left' },
  { name: 'nickname', label: 'Nickname', align: 'left' },
  { name: 'code', label: 'Code', align: 'left' },
  { name: 'access_token', label: 'Access Token', align: 'left' },
  { name: 'refresh_token', label: 'Refresh Token', align: 'left' },
  { name: 'actions', label: 'Actions', align: 'center' }
];

// Computed Property
const formTitle = computed(() => (editedIndex.value === -1 ? 'Add Account' : 'Edit Account'));

// Fetch Accounts
const getAccounts = () => {
  loadingtable.value = true;
  axios
    .get(`${store.backend_url}/accounts}/seller/index`, {
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'Accept': 'application/json',
        Authorization: store.authToken
      }
    })
    .then((res) => {
      accounts.value = res.data;
      loadingtable.value = false;
    })
    .catch((error) => {
      console.log(error);
      if (error.response.status === 401) {
        this.$router.push('/login');
      }
      loadingtable.value = false;
    });
};

// Open Dialog for Editing/Adding
const openDialog = () => {
  dialog.value = true;
};

// Save Account
const save = () => {
  if (editedIndex.value > -1) {
    editSeller();
  } else {
    createSeller();
  }
};

// Create Seller
const createSeller = () => {
  axios
    .post(`${store.backend_url}/seller/create`, {
      seller: {
        nickname: editedItem.value.nickname,
        code: editedItem.value.code,
        ml_seller_id: editedItem.value.ml_seller_id
      }
    }, {
      headers: { Authorization: store.authToken }
    })
    .then((res) => {
      getAccounts();
      close();
    })
    .catch((error) => {
      console.log(error);
      if (error.response.status === 401) {
        this.$router.push('/login');
      }
    });
};

// Edit Seller
const editSeller = () => {
  axios
    .post(`${store.backend_url}/seller/edit`, {
      seller: {
        nickname: editedItem.value.nickname,
        code: editedItem.value.code,
        ml_seller_id: editedItem.value.ml_seller_id,
        access_token: editedItem.value.access_token,
        refresh_token: editedItem.value.refresh_token
      }
    }, {
      headers: { Authorization: store.authToken }
    })
    .then((res) => {
      cf();
      close();
    })
    .catch((error) => {
      console.log(error);
      if (error.response.status === 401) {
        this.$router.push('/login');
      }
    });
};

// Delete Seller
const deleteSeller = () => {
  axios
    .post(`${store.backend_url}/seller/delete`, {
      seller: {
        ml_seller_id: editedItem.value.ml_seller_id
      }
    }, {
      headers: { Authorization: store.authToken }
    })
    .then((res) => {
      getAccounts();
      closeDelete();
    })
    .catch((error) => {
      console.log(error);
      if (error.response.status === 401) {
        this.$router.push('/login');
      }
    });
};

// Edit an Existing Item
const editItem = (item) => {
  editedIndex.value = accounts.value.indexOf(item);
  editedItem.value = { ...item };
  dialog.value = true;
};

// Confirm Delete
const confirmDelete = (item) => {
  editedIndex.value = accounts.value.indexOf(item);
  editedItem.value = { ...item };
  dialogDelete.value = true;
};

// Close Dialog
const close = () => {
  dialog.value = false;
  editedItem.value = { ...defaultItem };
  editedIndex.value = -1;
};

// Close Delete Dialog
const closeDelete = () => {
  dialogDelete.value = false;
  editedItem.value = { ...defaultItem };
  editedIndex.value = -1;
};

// Fetch accounts on mounted
onMounted(getAccounts);


</script>
